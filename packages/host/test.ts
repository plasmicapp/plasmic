import registerComponent from "./src/registerComponent";

registerComponent(
    ({mylist, myrich}: {mylist: {subtext: string}[], myrich: string}) => null,
    {
      name: "CC",
      importPath: "",
      props: {
        mylist: {
          type: "array",
          subfields: {
            a: {
              type: "number",
              subfields: {
                prop: {
                  type: "string"
                }
              }
            }
          }
        },
        myrich: {
          type: "richText"
        }
      }
    }
)
