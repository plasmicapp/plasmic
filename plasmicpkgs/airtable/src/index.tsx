export * from "./RecordData";
import {
  registerAirtableCollection,
  registerAirtableCredentialsProvider,
  registerAirtableRecord,
  registerAirtableRecordField,
} from "./RecordData";
import registerComponent from "@plasmicapp/host/registerComponent";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";

export function registerAll(loader?: {
  registerComponent: typeof registerComponent;
  registerGlobalContext: typeof registerGlobalContext;
}) {
  registerAirtableCollection(loader);
  registerAirtableCredentialsProvider(loader);
  registerAirtableRecord(loader);
  registerAirtableRecordField(loader);
}
