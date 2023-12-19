"""Command-line interface."""
from __future__ import annotations

import logging
from typing import Any, Literal, Annotated

import datetime
import google.auth.exceptions
from fastapi import FastAPI, Request, status, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import MetaData
from sqlalchemy import Table, Column, Integer
from sqlalchemy import inspect, create_engine
from sqlalchemy import select, text, insert, update, delete, and_, or_, not_, literal
import logging
import boto3
import re


logging.basicConfig()
logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)


log = logging.getLogger(__name__)


def coalesce(*arg):
    return next((a for a in arg if a is not None), None)


def swallow(f):
    try:
        return f()
    except:
        return None


app = FastAPI()


def identity(x):
    return x


def unhandled(x):
    raise Exception("Unhandled")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    exc_str = f"{exc}".replace("\n", " ").replace("   ", " ")
    logging.error(f"{request}: {exc_str}")
    content = {"status_code": 10422, "message": exc_str, "data": None}
    return JSONResponse(
        content=content, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
    )


ValType = Literal[
    "text",
    "number",
    "date",
    "time",
    "datetime",
    "select",
    "multiselect",
    "treeselect",
    "treemultiselect",
    "boolean",
    # This exists for some reason in Plasmic's codebase.
    # TODO Migrate away from this to prevent client-side concerns leaking into persisted database data.
    "number-custom",
    "boolean-custom",
    "datetime-custom",
    "select-custom",
]

val_parser_by_type = dict(
    text=identity,
    boolean=identity,
    number=identity,  # Check: NaN? Inf? Etc.
    date=datetime.date.fromisoformat,
    time=datetime.time.fromisoformat,
    datetime=datetime.datetime.fromisoformat,
    select=identity,
    multiselect=identity,
    treeselect=unhandled,
    treemultiselect=unhandled,
    **{
        "number-custom": identity,
        "boolean-custom": identity,
        "datetime-custom": datetime.datetime.fromisoformat,
        "select-custom": identity,
    },
)


class FilterRuleProps(BaseModel):
    field: str | None
    operator: Literal[
        "equal",
        "not_equal",
        "less",
        "less_or_equal",
        "greater",
        "greater_or_equal",
        "like",
        "not_like",
        "starts_with",
        "ends_with",
        "between",
        "not_between",
        "is_null",
        "is_not_null",
        "is_empty",
        "is_not_empty",
    ] | None
    value: list[Any]
    valueSrc: list[Literal["value"] | None]
    valueType: list[ValType] | None = Field(default=None)


class FilterRule(BaseModel):
    type: Literal["rule"]
    properties: FilterRuleProps


class FilterGroupProps(BaseModel):
    conjunction: Literal["AND", "OR"]
    not_: bool | None = Field(alias="not", default=None)
    # class Config:
    #     fields = {
    #         'not_': 'not'
    #     }


class FilterGroup(BaseModel):
    type: Literal["group"]
    properties: FilterGroupProps
    children1: list[Annotated[FilterRule | FilterGroup, Field(discriminator="type")]]


class TableField(BaseModel):
    type: ValType
    label: str


class FilterClause(BaseModel):
    tree: FilterGroup | FilterRule
    fields: dict[str, TableField]


class Pagination(BaseModel):
    pageSize: int
    pageIndex: int


class SortItem(BaseModel):
    field: str
    order: Literal["asc", "desc"]


class SelectOp(BaseModel):
    op: Literal["select"]
    resource: str
    filters: FilterClause | None = Field(default=None)
    sort: list[SortItem] | None = Field(default=None)
    pagination: Pagination | None = Field(default=None)


class InsertOp(BaseModel):
    op: Literal["insert"]
    resource: str
    writes: dict[str, Any]


class UpdateOp(BaseModel):
    op: Literal["update"]
    resource: str
    filters: FilterClause | None = Field(default=None)
    writes: dict[str, Any]


class DeleteOp(BaseModel):
    op: Literal["delete"]
    resource: str
    filters: FilterClause | None = Field(default=None)


class InspectOp(BaseModel):
    op: Literal["inspect"]
    inspectTables: list[str] | None = Field(default=None)


SqlalchemyOpBody = Annotated[
    SelectOp | InsertOp | UpdateOp | DeleteOp | InspectOp, Field(discriminator="op")
]


class SqlalchemyOpEnvelope(BaseModel):
    dburi: str
    engineKwargs: dict[str, Any] = Field(default={})
    body: SqlalchemyOpBody


@app.post("/api/v1/sqlalchemy")
def execute_sqlalchemy(op_envelope: SqlalchemyOpEnvelope, response: Response):
    engine = create_engine(op_envelope.dburi, echo=True, **op_envelope.engineKwargs)
    insp = inspect(engine)
    op = op_envelope.body
    supports_pagination = True

    if op.op in ["select", "insert", "update", "delete"]:
        metadata_obj = MetaData()
        # Don't want to autoload, since it's slow.
        # We just figure out what are the columns we need.
        # Doesn't seem to matter what types are declared here.
        # We'll use a literal "*" to include all columns for the select.
        cols = sorted(
            {
                *(op.filters.fields.keys() if getattr(op, "filters", None) else []),
                *(getattr(op, "writes", None) or {}).keys(),
                *(item.field for item in (getattr(op, "sort", None) or [])),
            }
        )
        subject_table = Table(
            op.resource,
            metadata_obj,
            *[Column(col, Integer) for col in cols],
        )

        def with_where(stmt):
            def rec(filter: FilterGroup | FilterRule):
                if filter.type == "group":
                    if filter.properties.conjunction == "AND":
                        combinator = and_
                    elif filter.properties.conjunction == "OR":
                        combinator = or_
                    else:
                        raise Exception(
                            f"Unknown conjunction {filter.properties.conjunction}"
                        )
                    if filter.properties.not_:
                        combinator = lambda *x: not_(combinator(*x))
                    children = [rec(child) for child in filter.children1]
                    children = [child for child in children if child is not None]
                    if len(children) == 0:
                        return None
                    return combinator(*children)
                elif filter.type == "rule":
                    props = filter.properties
                    if props.field is None:
                        return None
                    field = subject_table.c[props.field]
                    values = [
                        val_parser_by_type[valueType](value)
                        if value is not None
                        else None
                        for value, valueType in zip(props.value, props.valueType)
                    ]
                    [value] = values if len(values) == 1 else [None]
                    # There are operators not implemented from the default set:
                    # https://github.com/ukrbublik/react-awesome-query-builder/blob/25ae3a64fd337d50d73f72cb8c1b59119ba85eb1/CONFIG.adoc#L100
                    conds = dict(
                        equal=lambda: field == value,
                        not_equal=lambda: field != value,
                        less=lambda: field < value,
                        less_or_equal=lambda: field <= value,
                        greater=lambda: field > value,
                        greater_or_equal=lambda: field >= value,
                        like=lambda: field.like(value),
                        not_like=lambda: field.notlike(value),
                        starts_with=lambda: field.startswith(value),
                        ends_with=lambda: field.endswith(value),
                        between=lambda: field.between(*values),
                        not_between=lambda: not_(field.between(*values)),
                        is_null=lambda: field.is_(None),
                        is_not_null=lambda: field.is_not(None),
                        is_empty=lambda: field == "",
                        is_not_empty=lambda: field != "",
                    )
                    cond = conds[props.operator]()
                    return cond
                else:
                    raise Exception(f"Unknown filter type {filter.type}")

            return (
                stmt.where(coalesce(rec(op.filters.tree), literal(True)))
                if getattr(op, "filters", None)
                else stmt
            )

        def with_values(stmt):
            return stmt.values(**(op.writes or dict()))

        has_results = [False]

        def with_returning(stmt):
            # Check if this is supported by the DB.
            if op_envelope.dburi.startswith("shillelagh://"):
                return stmt
            else:
                has_results[0] = True
                return stmt.returning(text("*"))

        if op.op == "select":
            has_results[0] = True
            stmt = with_where(select(text("*")).select_from(subject_table)).order_by(
                *(subject_table.c[sort_item.field] for sort_item in op.sort or [])
            )
            if op.pagination and supports_pagination:
                stmt = stmt.offset(
                    op.pagination.pageIndex * op.pagination.pageSize
                ).limit(op.pagination.pageSize)
        elif op.op == "insert":
            stmt = with_returning(with_values(insert(subject_table)))
        elif op.op == "delete":
            stmt = with_returning(with_where(delete(subject_table)))
        elif op.op == "update":
            stmt = with_returning(with_values(with_where(update(subject_table))))
        else:
            raise Exception(f"Unknown op {op.op}")

        with engine.connect() as conn:
            try:
                log.info(stmt)
                raw_result = conn.execute(stmt)
                if has_results[0]:
                    result = [row._asdict() for row in raw_result]
                else:
                    result = None
            except google.auth.exceptions.RefreshError:
                response.status_code = status.HTTP_401_UNAUTHORIZED
                result = None

        return {"result": result}
    elif op.op == "inspect":
        tables = op.inspectTables or insp.get_table_names()
        try:
            result = {
                table: swallow(
                    lambda: [
                        {**col, "type": str(col["type"])}
                        for col in insp.get_columns(table)
                    ]
                )
                for table in tables
            }
        except google.auth.exceptions.RefreshError:
            response.status_code = status.HTTP_401_UNAUTHORIZED
            result = None
        return {"result": result}
