import omitBy from "lodash/omitBy";

export default function DisplayProps(props: any) {
  return (
    <p data-test-id="stringified-props" className={props.className}>
      {JSON.stringify(
        omitBy(
          props,
          (_val, key) => key.startsWith("data-plasmic") || key === "className"
        )
      )}
    </p>
  );
}
