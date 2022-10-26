import { ShowHideAction, ShowHideContent } from "../components/ShowHide";

export default function Page() {
  return (
    <div>
      <ShowHideAction>
        <button>Click me</button>
      </ShowHideAction>
      <ShowHideContent>
        <div>This content will show or hide.</div>
      </ShowHideContent>
    </div>
  );
}
