export function MySpecialComponent(props: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={props.className}>
      <div>This is my special code component</div>
      <div>{props.children}</div>
    </div>
  )
}