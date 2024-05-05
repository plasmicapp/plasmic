import { isKnownTplTag, TplNode } from "@/wab/classes";
import { Matcher } from "@/wab/client/components/view-common";
import Checkbox from "@/wab/client/components/widgets/Checkbox";
import { Textbox } from "@/wab/client/components/widgets/Textbox";
import { ViewComponent, ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import * as React from "react";
/*
type ModifyPanelSectionProps = {
  title: React.ReactNode;
  simpleContents: React.ReactNode;
};
class ModifyPanelSection extends React.Component<ModifyPanelSectionProps, {}> {
  render() {
    const props = L.assignIn({}, this.props, {
      simpleContents: (
        <ControlBlock contents={() => this.props.simpleContents} />
      ),
    });
    return <PanelSection {...props} />;
  }
}

interface ElementPanelComponentProps extends ViewComponentProps {
  tpl: TplNode;
}
abstract class ElementPanelComponent<
  P extends ElementPanelComponentProps = ElementPanelComponentProps,
  S = {}
> extends ViewComponent<P, S> {
  _StandardProp(props: Omit<StandardPropProps, "viewCtx" | "acceptsNull">) {
    return (
      <StandardProp viewCtx={this.viewCtx()} acceptsNull={true} {...props} />
    );
  }
}

export interface StandardPropProps {
  viewCtx: ViewCtx;
  label: string;
  expectedType: Type;
  prop?: string;
  acceptsNull: boolean;
  onChange?: (...args: any[]) => any;
  expr?: Expr;
  tpl?: TplTag;
  valNode?: ValNode;
}

class StandardProp extends NodeSelectComponent<StandardPropProps, {}> {
  render() {
    const valNode =
      this.props.valNode != null
        ? this.props.valNode
        : asVal(ensure(this.viewCtx().focusedSelectable()));
    const tpl =
      this.props.tpl != null
        ? this.props.tpl
        : ensureInstance(this.viewCtx().focusedTpl(), TplTag);
    const effectiveVs = this.viewCtx()
      .variantTplMgr()
      .effectiveVariantSetting(tpl);
    const expr =
      this.props.expr != null
        ? this.props.expr
        : this.props.prop
        ? effectiveVs.attrs[this.props.prop]
        : undefined;
    return (
      <VarControl
        expr={expr}
        def={expr}
        viewCtx={this.viewCtx()}
        varNameLabel={this.props.label}
        tpl={tpl}
        valNode={valNode}
        evalEnv={
           valNode != null
             ? this.viewCtx().cumEnvThroughValNode(valNode)
            : undefined
        }
        onChange={
          this.props.onChange != null
            ? this.props.onChange
            : (expr) => {
                return this.viewCtx().change(() => {
                  this.viewCtx()
                    .variantTplMgr()
                    .ensureCurrentVariantSetting(tpl).attrs[
                    ensure(this.props.prop)
                  ] = expr;
                });
              }
        }
      />
    );
  }
}
class TabularHandle {
  _tpl;
  constructor(tpl) {
    this._tpl = tpl;
  }
  baseTpl() {
    return this._tpl;
  }
  isDataTable() {
    throw new AbstractMethodError();
  }
  numCols() {
    throw new AbstractMethodError();
  }
  $$$allRows() {
    throw new AbstractMethodError();
  }
}
class TableLayoutHandle extends TabularHandle {
  isDataTable() {
    return false;
  }
  numCols() {
    return this._tpl.children[0].children.length;
  }
  $$$allRows() {
    return this.$$$rows();
  }
  $$$rows() {
    return $$$(this._tpl.children);
  }
}
class DataTableHandle extends TabularHandle {
  isDataTable() {
    return true;
  }
  numCols() {
    return this.$$$bodyRows().first().children().length();
  }
  _rows(tag) {
    const children = $$$(this.baseTpl()).children();
    if (this.isDataTable()) {
      return children.filter((tpl) => tpl.tag === tag).children();
    } else {
      return children;
    }
  }
  $$$headRows() {
    return this._rows("thead");
  }
  $$$bodyRows() {
    return this._rows("tbody");
  }
  $$$footRows() {
    return this._rows("tfoot");
  }
  $$$allRows() {
    return this.$$$headRows().add(this.$$$bodyRows()).add(this.$$$footRows());
  }
}
function getClosestTabularHandle(tpl: TplTag) {
  while (
    tpl.tag !== "table" &&
    RSH(getBaseRs(tpl), tpl).get("display") !== "table"
  ) {
    tpl = ensureInstance(tpl.parent, TplTag);
  }
  if (tpl.tag === "table") {
    return new DataTableHandle(tpl);
  } else {
    return new TableLayoutHandle(tpl);
  }
}
interface TablePanelSectionProps extends ElementPanelComponentProps {
  tableLayout?: any;
}

class _TablePanelSection extends ElementPanelComponent<
  TablePanelSectionProps,
  {}
> {
  render() {
    let mkCell;
    const { tableLayout } = this.props;
    const { tpl } = this.props;
    const ncols = tableLayout.numCols();
    if (tableLayout.isDataTable()) {
      const viewCtx = this.viewCtx();
      mkCell = function (section) {
        const tag = (() => {
          switch (section.tag) {
            case "thead":
              return "th";
            case "tbody":
              return "td";
            case "tfoot":
              return "td";
            default:
              throw new Error();
          }
        })();
        return viewCtx.variantTplMgr().mkTplTagX(tag, {}, "Empty cell");
      };
    } else {
      mkCell = () => {
        const tplTag = this.viewCtx()
          .variantTplMgr()
          .mkTplTagX("div", {}, "Empty cell");
        ensureBaseRs(this.viewCtx(), tplTag, { display: "table-cell" });
        return tplTag;
      };
    }
    const mkRowSpinner = (rows) => {
      let mkRow;
      const nrows = rows.length();
      const rowContainer = rows.first().parent();
      if (tableLayout.isDataTable()) {
        mkRow = () =>
          tpls.mkTplTag(
            "tr",
            range(0, ncols, false).map((col) => mkCell(rows.parent().get(0)))
          );
      } else {
        mkRow = () => {
          const tplTag = tpls.mkTplTag(
            "div",
            range(0, ncols, false).map((col) => mkCell())
          );
          ensureBaseRs(this.viewCtx(), tplTag, { display: "table-row" });
          return tplTag;
        };
      }
      return (
        <widgets.NumSpinner
          value={nrows}
          onChange={(num) => {
            return this.viewCtx().change(() => {
              if (num <= 0) {
                alert("Invalid value!");
                return;
              }
              if (
                num < nrows &&
                confirm("This will remove the last row(s)! Proceed?")
              ) {
                let needle, needle1;
                const sel = rows.slice(-(nrows - num));
                if (
                  ((needle = tpl), [...sel.toArray()].includes(needle)) ||
                  ((needle1 = tpl.parent), [...sel.toArray()].includes(needle1))
                ) {
                  this.viewCtx().setStudioFocusByTpl(tableLayout.baseTpl());
                }
                return sel.remove({ deep: true });
              } else if (num > nrows) {
                return range(nrows, num, false).map((i) =>
                  rowContainer.append(mkRow())
                );
              }
            });
          }}
        />
      );
    };
    return (
      <ModifyPanelSection
        title={"Table layout settings"}
        simpleContents={
          <>
            {tableLayout.baseTpl() !== tpl ? (
              <widgets.HGroup>
                <button
                  onClick={() => {
                    return this.viewCtx().setStudioFocusByTpl(
                      tableLayout.baseTpl()
                    );
                  }}
                >
                  {"Select full containing table"}
                </button>
              </widgets.HGroup>
            ) : undefined}
            {tableLayout.isDataTable() ? (
              <widgets.HGroup>
                <label>{"Body Rows"}</label>
                {mkRowSpinner(tableLayout.$$$bodyRows())}
              </widgets.HGroup>
            ) : (
              <widgets.HGroup>
                <label>{"Rows"}</label>
                {mkRowSpinner(tableLayout.$$$rows())}
              </widgets.HGroup>
            )}
            <widgets.HGroup>
              <label>{"Columns"}</label>

              <widgets.NumSpinner
                value={ncols}
                onChange={(num) => {
                  return this.viewCtx().change(() => {
                    let child;
                    if (num <= 0) {
                      alert("Invalid value!");
                      return;
                    }
                    if (
                      num < ncols &&
                      confirm("This will remove the last col(s)! Proceed?")
                    ) {
                      let needle;
                      const sel = $$$(
                        L.flatMap(tableLayout.$$$allRows().toArray(), (child) =>
                          $$$(child)
                            .children()
                            .slice(-(ncols - num))
                            .toArray()
                        )
                      );
                      if (
                        ((needle = tpl), [...sel.toArray()].includes(needle))
                      ) {
                        this.viewCtx().setStudioFocusByTpl(
                          tableLayout.baseTpl()
                        );
                      }
                      sel.remove({ deep: true });
                    } else if (num > ncols) {
                      [...tableLayout.$$$allRows().toArray()].map((child) => {
                        return range(ncols, num, false).map((i) =>
                          $$$(child).append(mkCell(child.parent))
                        );
                      });
                    }
                  });
                }}
              />
            </widgets.HGroup>
            {tableLayout.isDataTable() ? (
              <widgets.HGroup>
                <label>{"Header Rows"}</label>
                {mkRowSpinner(tableLayout.$$$headRows())}
              </widgets.HGroup>
            ) : undefined}
            {tableLayout.isDataTable() ? (
              <widgets.HGroup>
                <label>{"Footer Rows"}</label>
                {mkRowSpinner(tableLayout.$$$footRows())}
              </widgets.HGroup>
            ) : undefined}
          </>
        }
      />
    );
  }
}
class BodyPanelSection extends ElementPanelComponent<
  ElementPanelComponentProps,
  {}
> {
  render() {
    return (
      <ModifyPanelSection
        title={"Page"}
        simpleContents={this._StandardProp({
          label: "Browser Tab Title",
          prop: "title",
          expectedType: typeFactory.text(),
        })}
      />
    );
  }
}*/

type SettingsTabProps = {
  viewCtx: ViewCtx;
  tpl?: TplNode;
};
type SettingsTabState = {
  typeahead: string;
  showAll: boolean;
};
export class OldSettingsTab extends ViewComponent<
  SettingsTabProps,
  SettingsTabState
> {
  constructor(props) {
    super(props);
    this.state = {
      typeahead: "",
      showAll: false,
    };
  }
  render() {
    const tpl = this.viewCtx().focusedTpl(true);
    const tag = isKnownTplTag(tpl) ? tpl.tag : undefined;
    const matcher = new Matcher(this.state.typeahead, {
      matchMiddleOfWord: true,
    });
    // Note that this is inconsistent with @props.tpl if ever in the future that becomes != @viewCtx().focusedTpl()

    if (!tpl) {
      return null;
    }

    return (
      <div className={"flex-fill rel overflow-scroll-y settings-panel"}>
        {tpl == null ? (
          <div className={"panel-content"}>
            {"(select an element to configure settings)"}
          </div>
        ) : (
          <div>
            <div className={"panel-content"}>
              <div className={"panel-row"}>
                <div className={"panel-col-12"}>
                  <Textbox
                    className={"form-control"}
                    placeholder={"Search for prop"}
                    onChange={(e) =>
                      this.setState({ typeahead: e.target.value })
                    }
                    value={this.state.typeahead}
                  />
                </div>
              </div>

              {/* <QueriesSection /> */}

              {!this.state.typeahead ? (
                <div className={"panel-row"}>
                  <div className={"panel-col-12"}>
                    <Checkbox
                      onChange={(checked) =>
                        this.setState({ showAll: checked })
                      }
                      isChecked={this.state.showAll}
                    >
                      Show all
                    </Checkbox>
                  </div>
                </div>
              ) : undefined}
            </div>
            {/*!this.state.typeahead && (
                <>
                  <div className={"focused-scope"}>
                    {tpl != null
                      ? switchType(tpl)
                          .when(
                            [TplTag, TplComponent],
                            (tpl2: TplComponent | TplTag) => {
                              return (
                                <PanelSection
                                  title={"Logic"}
                                  children={
                                    <FocusedDataScopeSection
                                      key={tpl2.uid}
                                      viewCtx={this.props.viewCtx}
                                      scope={tpl2}
                                      valNode={maybe(
                                        this.viewCtx().focusedSelectable(),
                                        (selectable) =>
                                          ensureInstance(
                                            asVal(selectable),
                                            ValTag,
                                            ValComponent
                                          )
                                      )}
                                    />
                                  }
                                />
                              );
                            }
                          )
                          .when(TplSlot, () => null)
                          .result()
                      : undefined}
                  </div>

                  {(() => {
                    return tpl instanceof TplTag &&
                      tpls.isTableSubElement(tpl) <TablePanelSection
                        viewCtx={this.props.viewCtx}
                        tpl={tpl}
                      />
                      ? null
                      : tag === "body"
                      ? <BodyPanelSection
                        viewCtx={this.props.viewCtx}
                        tpl={tpl}
                      />
                      : undefined;
                  })()}
                </>

                )*/}{" "}
            {/*tpl instanceof TplTag || tpl instanceof TplComponent ? (
                <>
                  <PanelSection title={"Props"}>
                    <ComponentInputSection
                      hideTitle={true}
                      viewCtx={this.viewCtx()}
                      tpl={tpl}
                      valNode={maybe(
                        this.viewCtx().focusedSelectable(),
                        (focusObj) =>
                          ensureInstanceMaybe(
                            asVal(focusObj),
                            ValTag,
                            ValComponent
                          )
                      )}
                      // We also want to show all when typeaheading
                      showAll={
                        this.state.showAll || Boolean(this.state.typeahead)
                      }
                      matcher={matcher}
                    />
                  </PanelSection>
                  <AnnotationControls />
                </>
                    ) : undefined*/}
          </div>
        )}
      </div>
    );
  }
}
