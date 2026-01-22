import {
  DataProvider,
  repeatedElement,
  usePlasmicCanvasContext,
  useSelector,
} from "@plasmicapp/host";
import registerComponent, {
  CanvasComponentProps,
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import registerGlobalContext, {
  GlobalContextMeta,
} from "@plasmicapp/host/registerGlobalContext";
import { usePlasmicQueryData } from "@plasmicapp/query";
import React from "react";

const defaultHost = "https://studio.plasmic.app";

export interface DataSourceInfo {
  id: string;
  base: string;
  host?: string;
}

const CredentialsContext = React.createContext<DataSourceInfo | undefined>(
  undefined
);

interface RecordData {
  [field: string]: string | { id: string; url: string; filename: string }[];
}

export interface AirtableRecordProps {
  table: string;
  record: string;
}

export function AirtableRecord({
  table,
  record,
  children,
}: React.PropsWithChildren<AirtableRecordProps>) {
  const credentialsContext = React.useContext(CredentialsContext);

  const dataSourceId = credentialsContext && credentialsContext.id;
  const base = credentialsContext && credentialsContext.base;
  const host = (credentialsContext && credentialsContext.host) || defaultHost;

  const data = usePlasmicQueryData(
    JSON.stringify(["AirtableRecord", host, base, table, record, dataSourceId]),
    async () => {
      if (!base || !dataSourceId) {
        throw new Error(
          "Missing Data Source. Please select a Data Source from the Airtable Credentials Provider"
        );
      }
      if (!table) {
        throw new Error("AirtableRecord is missing the table name");
      }
      if (!record) {
        throw new Error("AirtableRecord is missing the record ID");
      }
      const pathname = `/${base}/${table}/${record}`;
      const url = `${host}/api/v1/server-data/query?pathname=${encodeURIComponent(
        pathname
      )}&dataSourceId=${dataSourceId}`;
      return (await (await fetch(url, { method: "GET" })).json())
        .fields as RecordData;
    }
  );

  if ("error" in data) {
    return <p>Error: {data.error?.message}</p>;
  }

  if (!("data" in data)) {
    return <p>Loading...</p>;
  }

  return (
    <DataProvider name={contextKey} data={data.data}>
      {children}
    </DataProvider>
  );
}

const contextKey = "__airtableRecord";

function useRecord() {
  return useSelector(contextKey) as RecordData | undefined;
}

export interface AirtableRecordFieldProps
  extends CanvasComponentProps<RecordData | undefined> {
  className?: string;
  style?: React.CSSProperties;
  field?: string;
}

export function AirtableRecordField({
  className,
  field,
  style,
  setControlContextData,
}: AirtableRecordFieldProps) {
  const record = useRecord();
  setControlContextData?.(record);

  return (
    <div className={className} style={style}>
      {record
        ? (() => {
            const val = record[field || Object.keys(record)[0]];
            if (val && typeof val === "object") {
              return "Attachment " + val[0].filename;
            }
            return val;
          })()
        : "Error: Must provide a record to AirtableRecordField"}
    </div>
  );
}

export interface AirtableCollectionProps {
  table: string;
  fields?: string[];
  filterByFormula?: string;
  maxRecords?: number;
  pageSize?: number;
  sort?: {
    field: string;
    direction?: "asc" | "desc";
  }[];
  view?: string;
}

export function AirtableCollection({
  table,
  children,
  ...props
}: React.PropsWithChildren<AirtableCollectionProps>) {
  const credentialsContext = React.useContext(CredentialsContext);

  const dataSourceId = credentialsContext && credentialsContext.id;
  const base = credentialsContext && credentialsContext.base;
  const host = (credentialsContext && credentialsContext.host) || defaultHost;

  const searchArray: string[] = [];
  if (props.fields) {
    props.fields.forEach((f) =>
      searchArray.push(
        `${encodeURIComponent(`fields[]`)}=${encodeURIComponent(`${f}`)}`
      )
    );
  }
  (["filterByFormula", "maxRecords", "pageSize", "view"] as const).forEach(
    (prop) => {
      if (props[prop]) {
        searchArray.push(
          `${encodeURIComponent(`${prop}`)}=${encodeURIComponent(
            `${props[prop]}`
          )}`
        );
      }
    }
  );
  if (props.sort) {
    props.sort.forEach((v, i) => {
      searchArray.push(
        `${encodeURIComponent(`sort[${i}][field]`)}=${encodeURIComponent(
          `${v.field}`
        )}`
      );
      if (v.direction) {
        searchArray.push(
          `${encodeURIComponent(`sort[${i}][direction]`)}=${encodeURIComponent(
            `${v.direction}`
          )}`
        );
      }
    });
  }

  const search = searchArray.length === 0 ? "" : "?" + searchArray.join("&");

  const { data, error, isLoading } = usePlasmicQueryData(
    JSON.stringify([
      "AirtableCollection",
      host,
      base,
      table,
      search,
      dataSourceId,
    ]),
    async () => {
      if (!base || !dataSourceId) {
        throw new Error(
          "Missing Data Source. Please select a Data Source from the Airtable Credentials Provider"
        );
      }
      if (!table) {
        throw new Error("AirtableCollection is missing the table name");
      }
      const pathname = `/${base}/${table}${search}`;
      const url = `${host}/api/v1/server-data/query?pathname=${encodeURIComponent(
        pathname
      )}&dataSourceId=${dataSourceId}`;
      return (await (await fetch(url, { method: "GET" })).json()).records as {
        fields: RecordData;
        id: string;
      }[];
    }
  );

  if (error) {
    return <p>Error: {error.message}</p>;
  }

  if (isLoading) {
    return <p>Loading...</p>;
  }

  return (
    <>
      {(data ?? []).map((record, index) => (
        <DataProvider key={record.id} name={contextKey} data={record.fields}>
          {repeatedElement(index, children)}
        </DataProvider>
      ))}
    </>
  );
}

interface AirtableCredentialsProviderProps {
  dataSource: DataSourceInfo;
  host?: string;
}

export function AirtableCredentialsProvider({
  dataSource,
  host: maybeHost,
  children,
}: React.PropsWithChildren<AirtableCredentialsProviderProps>) {
  const inCanvas = usePlasmicCanvasContext();
  if (inCanvas && (!dataSource || !dataSource.id || !dataSource.base)) {
    return (
      <p>
        Error: Missing Data Source. Please select a Data Source from the
        Airtable Credentials Provider
      </p>
    );
  }
  const host = maybeHost || defaultHost;
  return (
    <CredentialsContext.Provider value={{ ...dataSource, host }}>
      {children}
    </CredentialsContext.Provider>
  );
}

const thisModule = "@plasmicpkgs/airtable";

export const airtableRecordMeta: CodeComponentMeta<AirtableRecordProps> = {
  name: "hostless-airtable-record",
  displayName: "Airtable Record",
  importPath: thisModule,
  importName: "AirtableRecord",
  providesData: true,
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "component",
        name: "hostless-airtable-record-field",
      },
    },
    table: {
      type: "string",
      displayName: "Table Name",
      description: "The Airtable table name or ID",
    },
    record: {
      type: "string",
      displayName: "Record",
      description: "The table record ID",
    },
  },
};

export function registerAirtableRecord(
  loader?: { registerComponent: typeof registerComponent },
  customAirtableRecordMeta?: CodeComponentMeta<AirtableRecordProps>
) {
  if (loader) {
    loader.registerComponent(
      AirtableRecord,
      customAirtableRecordMeta ?? airtableRecordMeta
    );
  } else {
    registerComponent(
      AirtableRecord,
      customAirtableRecordMeta ?? airtableRecordMeta
    );
  }
}

export const airtableRecordFieldMeta: CodeComponentMeta<AirtableRecordFieldProps> =
  {
    name: "hostless-airtable-record-field",
    displayName: "Airtable Record Field",
    importPath: thisModule,
    importName: "AirtableRecordField",
    props: {
      field: {
        type: "choice",
        displayName: "Field Name",
        defaultValueHint: "The first field",
        options: (_props, data) => {
          return data ? Object.keys(data) : ["Data unavailable"];
        },
      },
    },
  };

export function registerAirtableRecordField(
  loader?: { registerComponent: typeof registerComponent },
  customAirtableRecordFieldMeta?: CodeComponentMeta<AirtableRecordFieldProps>
) {
  if (loader) {
    loader.registerComponent(
      AirtableRecordField,
      customAirtableRecordFieldMeta ?? airtableRecordFieldMeta
    );
  } else {
    registerComponent(
      AirtableRecordField,
      customAirtableRecordFieldMeta ?? airtableRecordFieldMeta
    );
  }
}

export const airtableCollectionMeta: CodeComponentMeta<AirtableCollectionProps> =
  {
    name: "hostless-airtable-collection",
    displayName: "Airtable Collection",
    importPath: thisModule,
    importName: "AirtableCollection",
    providesData: true,
    props: {
      children: {
        type: "slot",
        isRepeated: true,
        defaultValue: {
          type: "component",
          name: "hostless-airtable-record-field",
        },
      },
      table: {
        type: "string",
        displayName: "Table Name",
        description: "The Airtable table name or ID",
      },
      fields: {
        type: "object",
        displayName: "Fields",
        description: "List of strings containing the fields to be included",
      },
      maxRecords: {
        type: "number",
        displayName: "Max Records",
        description:
          "The maximum total number of records that will be returned",
        defaultValueHint: 100,
        max: 100,
        min: 1,
      },
      view: {
        type: "string",
        displayName: "View",
        description:
          "The name or ID of a view in the table. If set, only records from that view will be returned",
      },
      sort: {
        type: "object",
        displayName: "Sort",
        description:
          'A list of Airtable sort objects that specifies how the records will be ordered. Each sort object must have a field key specifying the name of the field to sort on, and an optional direction key that is either "asc" or "desc". The default direction is "asc"',
      },
      filterByFormula: {
        type: "string",
        displayName: "Filter by Formula",
        description: "An Airtable formula used to filter records",
      },
    },
  };

export function registerAirtableCollection(
  loader?: { registerComponent: typeof registerComponent },
  customAirtableCollectionMeta?: CodeComponentMeta<AirtableCollectionProps>
) {
  if (loader) {
    loader.registerComponent(
      AirtableCollection,
      customAirtableCollectionMeta ?? airtableCollectionMeta
    );
  } else {
    registerComponent(
      AirtableCollection,
      customAirtableCollectionMeta ?? airtableCollectionMeta
    );
  }
}

export const airtableCredentialsProviderMeta: GlobalContextMeta<AirtableCredentialsProviderProps> =
  {
    name: "hostless-airtable-credentials-provider",
    displayName: "Airtable Credentials Provider",
    importPath: thisModule,
    importName: "AirtableCredentialsProvider",
    props: {
      dataSource: {
        type: "dataSource",
        dataSource: "airtable",
        displayName: "Data Source",
        description: "The Airtable Data Source to use",
      },
      host: {
        type: "string",
        displayName: "Host",
        description: "Plasmic Server-Data URL",
        defaultValueHint: defaultHost,
      },
    },
  };

export function registerAirtableCredentialsProvider(
  loader?: { registerGlobalContext: typeof registerGlobalContext },
  customAirtableCredentialsProviderMeta?: GlobalContextMeta<AirtableCredentialsProviderProps>
) {
  if (loader) {
    loader.registerGlobalContext(
      AirtableCredentialsProvider,
      customAirtableCredentialsProviderMeta ?? airtableCredentialsProviderMeta
    );
  } else {
    registerGlobalContext(
      AirtableCredentialsProvider,
      customAirtableCredentialsProviderMeta ?? airtableCredentialsProviderMeta
    );
  }
}
