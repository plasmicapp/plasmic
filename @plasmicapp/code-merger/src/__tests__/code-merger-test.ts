import { CodeVersion } from "../plasmic-parser";
import {
  renameAndSerializePlasmicASTNode,
  ProjectSyncMetadataModel,
  ComponentSkeletonModel,
  mergeFiles,
  ComponentInfoForMerge,
  WarningInfo,
} from "../index";
import { formatted, code } from "../utils";
import { ensure } from "../common";
import { iteratee } from "lodash";

describe("Test CodeMerger", function () {
  it("no change", function () {
    const nameInIdToUuid = new Map([["Root", "Root"]]);
    const base = new CodeVersion(
      "<div className={rh.clsRoot()}>Hello World</div>",
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      "<div className={rh.clsRoot()}>Hello World</div>",
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      "<div className={rh.clsRoot()}>Hello World</div>",
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(formatted("<div className={rh.clsRoot()}>Hello World</div>"));
  });

  it("attribute without value, with null, tag with member reference", function () {
    const nameInIdToUuid = new Map([["Root", "Root"]]);
    const base = new CodeVersion(
      "<div className={rh.clsRoot()}>Hello World</div>",
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      "<MyTags.div className={rh.clsRoot()} disabled nulled={null} empty={{}}>Hello World</MyTags.div>",
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      "<MyTags.div className={rh.clsRoot()}>Hello World</MyTags.div>",
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(`
      <MyTags.div className={rh.clsRoot()} disabled nulled={null} empty={{}}>
        Hello World
      </MyTags.div>`)
    );
  });

  it("tag name conflicts", function () {
    const nameInIdToUuid = new Map([["Root", "Root"]]);
    const base = new CodeVersion(
      "<div className={rh.clsRoot()}>Hello World</div>",
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      "<MyTags.div className={rh.clsRoot()}>Hello World</MyTags.div>",
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      "<Button className={rh.clsRoot()}>Hello World</Button>",
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(`
      <MyTags.div___Button className={rh.clsRoot()}>
        Hello World
      </MyTags.div___Button>`)
    );
  });

  it("User added attribute preserved", function () {
    const nameInIdToUuid = new Map([["Root", "Root"]]);
    const base = new CodeVersion(
      "<div className={rh.clsRoot()}>Hello World</div>",
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      "<div className={rh.clsRoot()} width={1}>Hello World</div>",
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      "<div className={rh.clsRoot()}>Hello World</div>",
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(`<div className={rh.clsRoot()} width={1}>Hello World</div>`)
    );
  });

  it(`id function upgrade, downgrade, downgrade preserving rh.propsXXX(modifier)`, function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["MyLink", "MyLink"],
      ["MyButton", "MyButton"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
        <a className={rh.clsMyLink()} {...rh.propsMyLink()}>Google</a>
        <button className={rh.clsMyButton()} {...rh.propsMyButton()}/>
       </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()} width={1}>
        <a className={rh.clsMyLink()} {...rh.propsMyLink()}>Google</a>
        <button className={rh.clsMyButton()} {...rh.propsMyButton(modifier)}/>
       </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()} {...rh.propsRoot()}>
        <a className={rh.clsMyLink()}>Google</a>
        <button className={rh.clsMyButton()}/>
       </div>`,
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(`<div className={rh.clsRoot()} {...rh.propsRoot()} width={1}>
         <a className={rh.clsMyLink()}>Google</a>
        <button className={rh.clsMyButton()} {...rh.propsMyButton(modifier)} />
       </div>`)
    );
  });

  it(`className changed`, function () {
    const nameInIdToUuid = new Map([["Root", "Root"]]);
    const base = new CodeVersion(
      "<div className={rh.clsRoot()} />",
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      "<div className={rh.clsRoot()} />",
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      "<div className={rh.clsNewRoot()}/>",
      new Map([["NewRoot", "Root"]])
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(formatted(`<div className={rh.clsNewRoot()} />`));
  });

  it(`className appended`, function () {
    const nameInIdToUuid = new Map([["Root", "Root"]]);
    const base = new CodeVersion(
      "<div className={rh.clsRoot()} />",
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      "<div className={rh.clsRoot() + ' myClass'} />",
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      "<div className={rh.clsNewRoot()}/>",
      new Map([["NewRoot", "Root"]])
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(formatted(`<div className={rh.clsNewRoot() + ' myClass'} />`));
  });

  it(`className edited, but then deleted with id changed`, function () {
    const nameInIdToUuid = new Map([["Root", "Root"]]);
    const base = new CodeVersion(
      "<div className={rh.clsRoot()} />",
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      "<div className={rh.clsRoot() + ' myClass'} />",
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      "<div {...rh.propsNewRoot()}/>",
      new Map([["NewRoot", "Root"]])
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(
        `<div className={rh.clsNewRoot() + ' myClass'} {...rh.propsNewRoot()}/>`
      )
    );
  });

  it("add show func; remove show func", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["MyLink", "MyLink"],
      ["MyButton", "MyButton"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
        {rh.showMyLink() && <a {...rh.propsMyLink()}>Google</a>}
        <button {...rh.propsMyButton()}/>
      </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
        {rh.showMyLink() && <a {...rh.propsMyLink()}>Google</a>}
        <button {...rh.propsMyButton(modifier)}/>
      </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
        <a {...rh.propsMyLink()}>Google</a>
        {rh.showMyButton() && <button {...rh.propsMyButton()}/>}
      </div>`,
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(`<div className={rh.clsRoot()}>
         {true && <a {...rh.propsMyLink()}>Google</a>}
         {rh.showMyButton() && <button {...rh.propsMyButton(modifier)}/>}
       </div>`)
    );
  });

  it("node deleted", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["MyLink", "MyLink"],
      ["MyButton", "MyButton"],
    ]);
    const base = new CodeVersion(
      "<div className={rh.clsRoot()}><a {...rh.propsMyLink()}>Google</a><button className={rh.clsMyButton()} {...rh.propsMyButton()}/></div>",
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      "<div className={rh.clsRoot()} width={1}><button className={rh.clsMyButton()} {...rh.propsMyButton(modifier)}/></div>",
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      "<div className={rh.clsRoot()} {...rh.propsRoot()}><a className={rh.clsMyLink()}>Google</a><button className={rh.clsMyButton()}/></div>",
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(`<div className={rh.clsRoot()} {...rh.propsRoot()} width={1}>
        <button className={rh.clsMyButton()} {...rh.propsMyButton(modifier)} />
      </div>`)
    );
  });

  it("nodes reordered", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["MyLink", "MyLink"],
      ["MyButton", "MyButton"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <a className={rh.clsMyLink()} {...rh.propsMyLink()}>Google</a>
         <button className={rh.clsMyButton()} {...rh.propsMyButton()}/>
      </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()} width={1}>
        <button className={rh.clsMyButton()} {...rh.propsMyButton(modifier)}/>
        <a className={rh.clsMyLink()} {...rh.propsMyLink()}>Google</a>
      </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      "<div className={rh.clsRoot()} {...rh.propsRoot()}><button className={rh.clsMyButton()}/><a className={rh.clsMyLink()}>Google</a></div>",
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(`<div className={rh.clsRoot()} {...rh.propsRoot()} width={1}>
      <button className={rh.clsMyButton()} {...rh.propsMyButton(modifier)} />
      <a className={rh.clsMyLink()}>Google</a>
      </div>`)
    );
  });

  it("merge with old code that doesn't always generate className", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["MyLink", "MyLink"],
      ["MyButton", "MyButton"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <a {...rh.propsMyLink()}>Google</a>
         <button {...rh.propsMyButton()}/>
      </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()} width={1}>
        <button {...rh.propsMyButton(modifier)}/>
        <a {...rh.propsMyLink()}>Google</a>
      </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      "<div className={rh.clsRoot()} {...rh.propsRoot()}><button className={rh.clsMyButton()}/><a className={rh.clsMyLink()}>Google</a></div>",
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(`<div className={rh.clsRoot()} {...rh.propsRoot()} width={1}>
      <button className={rh.clsMyButton()} {...rh.propsMyButton(modifier)} />
      <a className={rh.clsMyLink()}>Google</a>
      </div>`)
    );
  });

  it("nodes wrapped", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["MyLink", "MyLink"],
      ["MyButton", "MyButton"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <button {...rh.propsMyButton()}/>
         <a className={rh.clsMyLink()}>Google</a>
      </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()} width={1}>
        {myGuard() && <button {...rh.propsMyButton()} tabIndex={1}/>}
        <Wrapper>
          <a className={rh.clsMyLink()} tabIndex={2}>Google</a>
        </Wrapper>
      </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()} {...rh.propsRoot()}>
        <button className={rh.clsMyButton()}/>
        <a className={rh.clsMyLink()}>Google</a>
      </div>`,
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(`<div  className={rh.clsRoot()} {...rh.propsRoot()} width={1}>
        {myGuard() && <button className={rh.clsMyButton()} tabIndex={1}/>}
        <Wrapper>
          <a className={rh.clsMyLink()} tabIndex={2}>Google</a>
        </Wrapper>
      </div>`)
    );
  });

  it("nodes wrapped for repetition", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["MyLink", "MyLink"],
      ["MyButton", "MyButton"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <button {...rh.propsMyButton()}/>
      </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()} width={1}>
        {items.map(() => {
          return (myGuard() && <button {...rh.propsMyButton()} tabIndex={1}/>);
          })
        }
      </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()} {...rh.propsRoot()}>
        <button className={rh.clsMyButton()}/>
      </div>`,
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(`<div className={rh.clsRoot()} {...rh.propsRoot()} width={1}>
      {items.map(() => {
        return (myGuard() && <button className={rh.clsMyButton()} tabIndex={1}/>);
        })
      }
      </div>`)
    );
  });

  it("nodes moved around", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["C1", "C1"],
      ["C2", "C2"],
      ["MyButton", "MyButton"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <div className={rh.clsC1()}>
           <button {...rh.propsMyButton()}/>
         </div>
         <div className={rh.clsC2()}>
         </div>
      </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <div className={rh.clsC1()}>
           <button {...rh.propsMyButton()} tabIndex={1}/>
         </div>
         <div className={rh.clsC2()}>
         </div>
      </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <div className={rh.clsC1()}>
           {args.text || "default"}
         </div>
         <div className={rh.clsC2()}>
           <button {...rh.propsMyButton()}/>
         </div>
      </div>`,
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(`<div className={rh.clsRoot()}>
      <div className={rh.clsC1()}>
        {args.text || "default"}
      </div>
      <div className={rh.clsC2()}>
      <button {...rh.propsMyButton()} tabIndex={1}/>
      </div>
   </div>`)
    );
  });

  it("merge children", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["Img", "Img"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
        Hello World
        <div className={rh.clsImg()}></div>
      </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
        {"Added text node"}
        Hello World
        <div>Opaque node 1</div>
        <div className={rh.clsImg()} onClick={xxx}></div>
        {"Second text"}
        {showThis() && <div>Opaque node 2</div>}
      </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
        Hello World Edited
        <div className={rh.clsImg()}></div>
      </div>`,
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(`
      <div className={rh.clsRoot()}>
        {"Added text node"}
        Hello World Edited
        <div>Opaque node 1</div>
        <div className={rh.clsImg()} onClick={xxx}></div>
        {"Second text"}
        {showThis() && <div>Opaque node 2</div>}
     </div>`)
    );
  });

  it("single text child edited", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["Img", "Img"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
        Hello World
        <div className={rh.clsImg()}></div>
      </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
        Hello World Edited
      </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
        Hello World
      </div>`,
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(`
      <div className={rh.clsRoot()}>
      Hello World Edited
     </div>`)
    );
  });

  it("multiple text children edited", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["Img", "Img"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
        {"Hello"} {"World"} {"My"} {"Friends"}
        <div className={rh.clsImg()}></div>
      </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
      {"Hello1"} {"World"} {"My2"} {"Friends"}
      </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
      {"Hello"} {"World"} {"My3"} {"Friends"}
      </div>`,
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(`
      <div className={rh.clsRoot()}>
      {"Hello1"}
      {"World"}
      {"My3"}
      {"My2"}
      {"Friends"}
     </div>`)
    );
  });

  it("conflict attributes are both preserved", function () {
    const nameInIdToUuid = new Map([["Root", "Root"]]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
      </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()} tabindex={123}>
      Hello World
      </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()} tabindex={234}>
      </div>`,
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(`<div className={rh.clsRoot()} tabindex={<>{123}{234}</>}>
      Hello World
   </div>`)
    );
  });

  it("event handlers edited and/or deleted", function () {
    const nameInIdToUuid = new Map([["Root", "Root"]]);
    const base = new CodeVersion(
      `<div className={ rh.clsRoot() }
        onMouseEnter={ rh.onMouseEnterRoot }
        onMouseLeave={rh.onMouseLeaveRoot}
        onMouseDown={rh.onMouseDownRoot}>
      </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()
      }
        onMouseEnter={
          rh.onMouseEnterRoot}
        onMouseLeave={() => {
          rh.onMouseLeaveRoot();
          myEventHandler();
        }}
        onClick={handleClick}>
      Hello World
      </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={ rh.clsNewRoot()}
       onMouseEnter={ rh.onMouseEnterNewRoot}
       onMouseLeave={rh.onMouseLeaveNewRoot}
       onMouseDown={rh.onMouseDownNewRoot}>
      </div>`,
      new Map([["NewRoot", "Root"]])
    );
    // Developer would have to fix rh.onRootMouseLeave to
    // rh.onNewRootMouseLeave.
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(`<div
        className={rh.clsNewRoot()}
        onMouseEnter={rh.onMouseEnterNewRoot}
        onMouseLeave={() => {
          rh.onMouseLeaveNewRoot();
          myEventHandler();
        }}
        onClick={handleClick}>
        Hello World
   </div>`)
    );
  });

  it("add children", function () {
    const nameInIdToUuid = new Map([["Root", "Root"]]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()} />`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()} />`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
        <div className={rh.clsBox()}/>
      </div>`,
      new Map([
        ["Root", "Root"],
        ["Box", "Box"],
      ])
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(`<div className={rh.clsRoot()}>
        <div className={rh.clsBox()}/>
      </div>`)
    );
  });

  it("attribute changed in Plasmic", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["Img", "Img"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()} icon={<img className={rh.clsImg()}></img>} />`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()} icon={<img className={rh.clsImg()}></img>} />`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()} icon={<img className={rh.clsImg()} {...rh.propsImg()}></img>} />`,
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(
        `<div className={rh.clsRoot()} icon={<img className={rh.clsImg()} {...rh.propsImg()}></img>} />`
      )
    );
  });

  it("text node not changed", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["Btn", "Btn"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <button className={rh.clsBtn()}>Click Me</button>
       </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <button className={rh.clsBtn()}>
           Click Me
         </button>
       </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <button className={rh.clsBtn()}>Click Me</button>
       </div>`,
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(
        `<div className={rh.clsRoot()}>
         <button className={rh.clsBtn()}>
           Click Me
         </button>
       </div>`
      )
    );
  });

  it("text node changed from JSXText to function call", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["Btn", "Btn"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <button className={rh.clsBtn()}>Click Me</button>
       </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <button className={rh.clsBtn()}>
           Click Me
         </button>
       </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <button className={rh.clsBtn()}>{rh.childStrBtn()}</button>
       </div>`,
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(
        `<div className={rh.clsRoot()}>
         <button className={rh.clsBtn()}>
           {rh.childStrBtn()}
         </button>
       </div>`
      )
    );
  });

  it("text node changed function call to JSXText", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["Btn", "Btn"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <button className={rh.clsBtn()}>{rh.childStrBtn()}</button>
       </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <button className={rh.clsBtn()}>
         {rh.childStrBtn()}
         </button>
       </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <button className={rh.clsBtn()}>Click Me</button>
       </div>`,
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(
        `<div className={rh.clsRoot()}>
         <button className={rh.clsBtn()}>
           Click Me
         </button>
       </div>`
      )
    );
  });

  it("tag change in new version", function () {
    const nameInIdToUuid = new Map([["Root", "Root"]]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
       </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
       </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<button className={rh.clsRoot()}>
       </button>`,
      nameInIdToUuid
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(
        `<button className={rh.clsRoot()}>
         </button>`
      )
    );
  });

  it("slot node name changed and wrapper edited", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["$slotText", "1234"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
        <PlasmicSlot className={rh.cls$slotText()} value={args.text} defaultContent={"Abc"} />
       </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
        <PlasmicSlot className={rh.cls$slotText()} value={args.text} defaultContent={<a>"Abc"</a>} />
       </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
        <PlasmicSlot className={rh.cls$slotText2()} value={args.text2} defaultContent={"Abc"} />
       </div>`,
      new Map([
        ["Root", "Root"],
        ["$slotText2", "1234"],
      ])
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(
        `<div className={rh.clsRoot()}>
        <PlasmicSlot className={rh.cls$slotText2()} value={args.text2} defaultContent={<a>"Abc"</a>} />
       </div>`
      )
    );
  });

  it("slot node name changed and default node edited", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["$slotText", "1234"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
        <PlasmicSlot value={args.text} className={rh.cls$slotText()} defaultContent={"Hello"} />
       </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
        <PlasmicSlot value={args.text} className={rh.cls$slotText()} defaultContent={"Hello World"} />
       </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
        <PlasmicSlot value={args.text2} className={rh.cls$slotText2()} defaultContent={"Hello"} />
       </div>`,
      new Map([
        ["Root", "Root"],
        ["$slotText2", "1234"],
      ])
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(
        `<div className={rh.clsRoot()}>
        <PlasmicSlot value={args.text2} className={rh.cls$slotText2()} defaultContent={"Hello World"} />
       </div>`
      )
    );
  });

  it("apply slot style via inheritance works for non text slot - always has a wrapper", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["Img0", "1234"],
      ["$slotIconSlot", "2345"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
        <PlasmicSlot
          className={rh.cls$slotIconSlot()}
          value={args.iconSlot}
          defaultContent={<img className={rh.clsImg0()}></img>} >
        </PlasmicSlot>
       </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
        <PlasmicSlot
          className={rh.cls$slotIconSlot()}
          value={args.iconSlot}
          defaultContent={<img className={rh.clsImg0() + " my"}></img>} >
        </PlasmicSlot>
       </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
        <PlasmicSlot
          className={rh.cls$slotIconSlot2()}
          value={args.iconSlot2}
          defaultContent={<img className={rh.clsImg0()}></img>} >
        </PlasmicSlot>
       </div>`,
      new Map([
        ["Root", "Root"],
        ["Img0", "1234"],
        ["$slotIconSlot2", "2345"],
      ])
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(
        `<div className={rh.clsRoot()}>
        <PlasmicSlot
          className={rh.cls$slotIconSlot2()}
          value={args.iconSlot2}
          defaultContent={<img className={rh.clsImg0() + " my"}></img>} >
        </PlasmicSlot>
       </div>`
      )
    );
  });

  it("apply slot style via inheritance works for non text slot - adding a wrapper", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["Img0", "1234"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
        {args.iconSlot || <img className={rh.clsImg0()}></img>}
       </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
        {args.iconSlot || <img className={rh.clsImg0() + " my"}></img>}
       </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
        <div className={rh.cls$slotIconSlot()}>
          {args.iconSlot || <img className={rh.clsImg0()}></img>}
        </div>
       </div>`,
      new Map([
        ["Root", "Root"],
        ["Img0", "1234"],
        ["$slotIconSlot", "2345"],
      ])
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(
        `<div className={rh.clsRoot()}>
        <div className={rh.cls$slotIconSlot()}>
          {args.iconSlot || <img className={rh.clsImg0() + " my"}></img>}
        </div>
       </div>`
      )
    );
  });

  it("apply slot style via inheritance works for non text slot - removing the wrapper", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["Img0", "1234"],
      ["$slotIconSlot", "2345"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <div className={rh.cls$slotIconSlot()}>
          {args.iconSlot || <img className={rh.clsImg0()}></img>}
         </div>
       </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <div className={rh.cls$slotIconSlot()}>
          {args.iconSlot || <img className={rh.clsImg0() + " my"}></img>}
         </div>
       </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
          {args.iconSlot2 || <img className={rh.clsImg0()}></img>}
       </div>`,
      new Map([
        ["Root", "Root"],
        ["Img0", "1234"],
        ["$slotIconSlot2", "2345"],
      ])
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(
        `<div className={rh.clsRoot()}>
        {args.iconSlot2 || <img className={rh.clsImg0() + " my"}></img>}
     </div>`
      )
    );
  });

  it("merge two slots's defaultContent - 1 node and 2 nodes", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["Img0", "1234"],
      ["$slotIconSlot", "2345"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <PlasmicSlot
           className={rh.cls$slotIconSlot()}
           value={args.iconSlot}
           defaultContent={<img className={rh.clsImg0()}></img>}/>
       </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <PlasmicSlot
           className={rh.cls$slotIconSlot()}
           value={args.iconSlot}
           defaultContent={<img className={rh.clsImg0()} tabIndex={1}></img>}/>
       </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <PlasmicSlot
           className={rh.cls$slotIconSlot2()}
           value={args.iconSlot}
           defaultContent={
             <>
               <img className={rh.clsImg1()}></img>
               <img className={rh.clsImg0()}></img>
             </>}/>
       </div>`,
      new Map([
        ["Root", "Root"],
        ["Img0", "1234"],
        ["Img1", "4567"],
        ["$slotIconSlot2", "2345"],
      ])
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(
        `<div className={rh.clsRoot()}>
        <PlasmicSlot
          className={rh.cls$slotIconSlot2()}
          value={args.iconSlot}
          defaultContent={
            <>
              <img className={rh.clsImg1()}></img>
              <img className={rh.clsImg0()} tabIndex={1}></img>
            </>}/>
      </div>`
      )
    );
  });

  it("merge two slots's defaultContent - 1 node and 1 node", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["Img0", "1234"],
      ["$slotIconSlot", "2345"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <PlasmicSlot
           className={rh.cls$slotIconSlot()}
           value={args.iconSlot}
           defaultContent={<img className={rh.clsImg0()}></img>}/>
       </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <PlasmicSlot
           className={rh.cls$slotIconSlot()}
           value={args.iconSlot}
           defaultContent={<><img className={rh.clsImg0()} tabIndex={1}></img></>}/>
       </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <PlasmicSlot
           className={rh.cls$slotIconSlot2()}
           value={args.iconSlot}
           defaultContent={
              <img className={rh.clsImg1()}></img>
           }/>
       </div>`,
      new Map([
        ["Root", "Root"],
        ["Img1", "1234"],
        ["$slotIconSlot2", "2345"],
      ])
    );
    // When the result is only one node, we follow edited version to add the
    // fragment or not.
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(
        `<div className={rh.clsRoot()}>
        <PlasmicSlot
          className={rh.cls$slotIconSlot2()}
          value={args.iconSlot}
          defaultContent={
            <><img className={rh.clsImg1()} tabIndex={1}></img></>
          }/>
      </div>`
      )
    );
  });

  it("renaming of argsRef", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["$slotIconSlot", "2345"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <PlasmicSlot
           className={rh.cls$slotIconSlot()}
           value={args.iconSlot}
           defaultContent={<></>}/>
       </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <PlasmicSlot
           className={rh.cls$slotIconSlot()}
           value={args.iconSlot || "abc"}
           defaultContent={<></>}/>
       </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <PlasmicSlot
           className={rh.cls$slotIconSlot2()}
           value={args.iconSlot2}
           defaultContent={
              <></>
           }/>
       </div>`,
      new Map([
        ["Root", "Root"],
        ["$slotIconSlot2", "2345"],
      ])
    );
    // When the result is only one node, we follow edited version to add the
    // fragment or not.
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(
        `<div className={rh.clsRoot()}>
        <PlasmicSlot
          className={rh.cls$slotIconSlot2()}
          value={args.iconSlot2 || "abc"}
          defaultContent={<></>}/>
      </div>`
      )
    );
  });

  it("renaming of args in non argsRef", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["$slotIconSlot", "2345"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <PlasmicSlot
           className={rh.cls$slotIconSlot()}
           value={args.iconSlot}
           defaultContent={<></>}/>
       </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <PlasmicSlot
           className={rh.cls$slotIconSlot()}
           value={args.iconSlot || "abc"}
           defaultContent={<></>}/>
          {showArgsAgain() && args.iconSlot}
       </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
         <PlasmicSlot
           className={rh.cls$slotIconSlot2()}
           value={args.iconSlot2}
           defaultContent={
              <></>
           }/>
       </div>`,
      new Map([
        ["Root", "Root"],
        ["$slotIconSlot2", "2345"],
      ])
    );
    // When the result is only one node, we follow edited version to add the
    // fragment or not.
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(
        `<div className={rh.clsRoot()}>
        <PlasmicSlot
          className={rh.cls$slotIconSlot2()}
          value={args.iconSlot2 || "abc"}
          defaultContent={<></>}/>
        {showArgsAgain() && args.iconSlot2}
      </div>`
      )
    );
  });

  it("serialize nodes in user added attributes and handle moved node", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["Btn", "2345"],
      ["Img", "3456"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
        <Button className={rh.clsBtn()}/>
        <img className={rh.clsImg()}></img>
       </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
      <Button className={rh.clsBtn()} icon={<img className={rh.clsImg()} tabIndex={1}></img>}/>
     </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
      <Button className={rh.clsBtn()}/>
      <img className={rh.clsImg2()}></img>
     </div>`,
      new Map([
        ["Root", "Root"],
        ["Btn", "2345"],
        ["Img2", "3456"],
      ])
    );
    // When the result is only one node, we follow edited version to add the
    // fragment or not.
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(
        `<div className={rh.clsRoot()}>
        <Button className={rh.clsBtn()} icon={<img className={rh.clsImg2()} tabIndex={1}></img>}/>
       </div>`
      )
    );
  });

  it("parse and serialize nodes in spreador attribute", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["Btn", "2345"],
      ["Img", "3456"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
        <Button className={rh.clsBtn()} {...rh.propsBtn()}/>
        <img className={rh.clsImg()}></img>
       </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
      <Button className={rh.clsBtn()} {...{icon: <img className={rh.clsImg()} tabIndex={1}></img>}}/>
     </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
      <Button className={rh.clsBtn()}/>
      <img className={rh.clsImg2()}></img>
     </div>`,
      new Map([
        ["Root", "Root"],
        ["Btn", "2345"],
        ["Img2", "3456"],
      ])
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(
        `<div className={rh.clsRoot()}>
        <Button className={rh.clsBtn()}
          {...{
            icon: <img className={rh.clsImg2()} tabIndex={1}></img>
          }}/>
       </div>`
      )
    );
  });

  it("parse, preserve and merge secondary nodes when primary node remains", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["Btn", "2345"],
      ["Img", "3456"],
      ["Link", "4567"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
        <Button className={rh.clsBtn()} {...rh.propsBtn()}/>
        {rh.showImg() && <img className={rh.clsImg()}></img>}
        {rh.showLink() && <a className={rh.clsLink()}></a>}
       </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
      {(() => {
        return (<>
          <Button className={rh.clsBtn()} {...rh.propsBtn()}/>
          {rh.showImg() && <img className={rh.clsImg() + " myClass"} tabIndex={1}></img>}
          {rh.showLink() && <a className={rh.clsLink()}></a>}
          </>);
      })()}
     </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
      <Button className={rh.clsBtn()} {...rh.propsBtn()}/>
      {rh.showImg2() && <img className={rh.clsImg2()} {...rh.propsImg2()}></img>}
      <a className={rh.clsLink2()}></a>
     </div>`,
      new Map([
        ["Root", "Root"],
        ["Btn", "2345"],
        ["Img2", "3456"],
        ["Link2", "4567"],
      ])
    );
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(
      formatted(
        `<div className={rh.clsRoot()}>
        {(() => {
          return (<>
            <Button className={rh.clsBtn()} {...rh.propsBtn()}/>
            {rh.showImg2() && <img className={rh.clsImg2() + " myClass"} {...rh.propsImg2()} tabIndex={1}></img>}
            {true && <a className={rh.clsLink2()}></a>}
            </>);
        })()}
       </div>`
      )
    );
  });

  it("parse but delete secondary nodes when primary node was deleted", function () {
    const nameInIdToUuid = new Map([
      ["Root", "Root"],
      ["Btn", "2345"],
      ["Img", "3456"],
    ]);
    const base = new CodeVersion(
      `<div className={rh.clsRoot()}>
        <Button className={rh.clsBtn()} {...rh.propsBtn()}/>
        <img className={rh.clsImg()}></img>
       </div>`,
      nameInIdToUuid
    );
    const edited = new CodeVersion(
      `<div className={rh.clsRoot()}>
      {(() => {
        return (<>
          <Button className={rh.clsBtn()} {...rh.propsBtn()}/>
          <img className={rh.clsImg() + " myClass"} tabIndex={1}></img>
          </>);
      })()}
     </div>`,
      nameInIdToUuid
    );
    const newV = new CodeVersion(
      `<div className={rh.clsRoot()}>
        {rh.showImg2() && <img className={rh.clsImg2()} {...rh.propsImg2()}></img>}
       </div>`,
      new Map([
        ["Root", "Root"],
        ["Btn", "2345"],
        ["Img2", "3456"],
      ])
    );
    // When the result is only one node, we follow edited version to add the
    // fragment or not.
    expect(
      code(
        renameAndSerializePlasmicASTNode(newV.root, {
          newVersion: newV,
          editedVersion: edited,
          baseVersion: base,
        })
      )
    ).toEqual(formatted(`<div className={rh.clsRoot()}></div>`));
  });

  it("projectSyncMetadataModel", function () {
    const m = new ProjectSyncMetadataModel([
      new ComponentSkeletonModel(
        "001",
        new Map<string, string>([
          ["a", "1"],
          ["b", "2"],
        ]),
        "content 001"
      ),
      new ComponentSkeletonModel(
        "002",
        new Map<string, string>([
          ["c", "3"],
          ["d", "4"],
        ]),
        "content 002"
      ),
    ]);

    expect(JSON.stringify(m)).toEqual(
      `[{"uuid":"001","nameInIdToUuid":[["a","1"],["b","2"]],"fileContent":"content 001"},{"uuid":"002","nameInIdToUuid":[["c","3"],["d","4"]],"fileContent":"content 002"}]`
    );
    const deser = ProjectSyncMetadataModel.fromJson(JSON.stringify(m));
    expect(deser.components.length).toBe(2);
    expect(deser.components[0].uuid).toEqual("001");
    expect(deser.components[0].fileContent).toEqual("content 001");
    expect(deser.components[0].nameInIdToUuid).toEqual(
      m.components[0].nameInIdToUuid
    );

    expect(deser.components[1].uuid).toEqual("002");
    expect(deser.components[1].fileContent).toEqual("content 002");
    expect(deser.components[1].nameInIdToUuid).toEqual(
      m.components[1].nameInIdToUuid
    );
  });

  it("mergeFiles should work", async function () {
    const componentByUuid = new Map<string, ComponentInfoForMerge>();
    componentByUuid.set("comp1", {
      // edited version of the code, i.e. the entire file.
      editedFile: `
      import React, { ReactNode } from "react";
      import { hasVariant, DefaultFlexStack, FlexStack } from "@plasmicapp/react-web";

      import {
        PlasmicCodeSandboxDialogContent__RenderHelper,
        PlasmicCodeSandboxDialogContent__VariantsArgs,
        PlasmicCodeSandboxDialogContent__VariantsType,
        PlasmicCodeSandboxDialogContent__TriggerStateType
      } from "./PP__CodeSandboxDialogContent"; // plasmic-import: f68b061e-0f85-41c1-8707-3ba9f634f1af/render
      import Button from "../Button"; // plasmic-import: 4SYnkOQLd5/component
      import { PlasmicButton__VariantsArgs } from "../../../plasmic/PlasmicButton"; // plasmic-import: 4SYnkOQLd5/renderer
      import Dropdown from "./Dropdown"; // plasmic-import: a200b79f-288d-4306-be99-e5fd221b8ba6/component
      import { PlasmicDropdown__VariantsArgs } from "./PP__Dropdown"; // plasmic-import: a200b79f-288d-4306-be99-e5fd221b8ba6/renderer
      import DropdownItem from "./DropdownItem"; // plasmic-import: f4c2f0bb-8dce-49c7-a106-65abe9e70e51/component
      import { PlasmicDropdownItem__VariantsArgs } from "./PP__DropdownItem"; // plasmic-import: f4c2f0bb-8dce-49c7-a106-65abe9e70e51/renderer
      import IconButton from "../../IconButton"; // plasmic-import: cfe92-5RW/component
      import { PlasmicIconButton__VariantsArgs } from "../../../plasmic/PlasmicIconButton"; // plasmic-import: cfe92-5RW/renderer
      import * as antd from "antd"; // plasmic-import: the-uuid/jsBundle

      function Comp1() {
        // plasmic-managed-start
        const rh = new PlasmicTreeRow__RenderHelper(variants, args, props.className);
        // plasmic-managed-end

        // plasmic-managed-jsx/2
        return <div className={rh.clsRoot()}
                onMouseEnter={
                   rh.onMouseEnterRoot}
                onMouseLeave={() => {
                  rh.onMouseLeaveRoot();
                  myEventHandler();
                }}
                onClick={handleClick}>
                  Hello World
                  <div className={rh.clsHint()}>{rh.childStrHint()}</div>
                </div>;
      }`,
      newFile: `
      import { hasVariant, DefaultFlexStack, FlexStack } from "@plasmicapp/react-web";

      import {
        PlasmicCodeSandboxDialogContent__RenderHelper,
        PlasmicCodeSandboxDialogContent__VariantsArgs,
        PlasmicCodeSandboxDialogContent__VariantsType,
        PlasmicCodeSandboxDialogContent__TriggerStateType
      } from "./PP__CodeSandboxDialogContent"; // plasmic-import: f68b061e-0f85-41c1-8707-3ba9f634f1af/render
      import Button from "../Button"; // plasmic-import: 4SYnkOQLd5/component
      import { PlasmicButton__VariantsArgs } from "../../../plasmic/PlasmicButton"; // plasmic-import: 4SYnkOQLd5/renderer
      import Dropdown from "./Dropdown"; // plasmic-import: a200b79f-288d-4306-be99-e5fd221b8ba6/component
      import { PlasmicDropdown__VariantsArgs } from "./PP__Dropdown"; // plasmic-import: a200b79f-288d-4306-be99-e5fd221b8ba6/renderer
      import DropdownItem from "./DropdownItem"; // plasmic-import: f4c2f0bb-8dce-49c7-a106-65abe9e70e51/component
      import { PlasmicDropdownItem__VariantsArgs } from "./PP__DropdownItem"; // plasmic-import: f4c2f0bb-8dce-49c7-a106-65abe9e70e51/renderer
      import IconButton from "../../IconButton"; // plasmic-import: cfe92-5RW/component
      import { PlasmicIconButton__VariantsArgs } from "../../../plasmic/PlasmicIconButton"; // plasmic-import: cfe92-5RW/renderer
      import * as antd from "antd"; // plasmic-import: the-uuid/jsBundle

      function Comp1() {
        // plasmic-managed-start
        const rh = new PlasmicTreeRow__RenderHelper(variants, args, props.className);
        // plasmic-managed-end

        // plasmic-managed-jsx/3
        return <div className={ rh.clsNewRoot()}
          onMouseEnter={ rh.onMouseEnterNewRoot}
          onMouseLeave={rh.onMouseLeaveNewRoot}
          onMouseDown={rh.onMouseDownNewRoot}>
          <div className={rh.clsHint()}>{rh.childStrHint()}</div>
        </div>;
      }`,
      // map for newCode
      newNameInIdToUuid: new Map([
        ["NewRoot", "Root"],
        ["Hint", "Hint"],
      ]),
    });

    const baseInfo = new ProjectSyncMetadataModel([
      new ComponentSkeletonModel(
        "comp1",
        new Map([
          ["Root", "Root"],
          ["Hint", "Hint"],
        ]),
        `
        import { hasVariant, DefaultFlexStack, FlexStack } from "@plasmicapp/react-web";

        import {
          PlasmicCodeSandboxDialogContent__RenderHelper,
          PlasmicCodeSandboxDialogContent__VariantsArgs,
          PlasmicCodeSandboxDialogContent__VariantsType,
          PlasmicCodeSandboxDialogContent__TriggerStateType
        } from "./PP__CodeSandboxDialogContent"; // plasmic-import: f68b061e-0f85-41c1-8707-3ba9f634f1af/render
        import Button from "../Button"; // plasmic-import: 4SYnkOQLd5/component
        import { PlasmicButton__VariantsArgs } from "../../../plasmic/PlasmicButton"; // plasmic-import: 4SYnkOQLd5/renderer
        import Dropdown from "./Dropdown"; // plasmic-import: a200b79f-288d-4306-be99-e5fd221b8ba6/component
        import { PlasmicDropdown__VariantsArgs } from "./PP__Dropdown"; // plasmic-import: a200b79f-288d-4306-be99-e5fd221b8ba6/renderer
        import DropdownItem from "./DropdownItem"; // plasmic-import: f4c2f0bb-8dce-49c7-a106-65abe9e70e51/component
        import { PlasmicDropdownItem__VariantsArgs } from "./PP__DropdownItem"; // plasmic-import: f4c2f0bb-8dce-49c7-a106-65abe9e70e51/renderer
        import IconButton from "../../IconButton"; // plasmic-import: cfe92-5RW/component
        import { PlasmicIconButton__VariantsArgs } from "../../../plasmic/PlasmicIconButton"; // plasmic-import: cfe92-5RW/renderer
        import * as antd from "antd"; // plasmic-import: the-uuid/jsBundle

        function Comp1() {
           // plasmic-managed-start
           const rh = new PlasmicTreeRow__RenderHelper(variants, args, props.className);
           // plasmic-managed-end

           // plasmic-managed-jsx/2
           return <div className={ rh.clsRoot() }
                   onMouseEnter={ rh.onMouseEnterRoot }
                   onMouseLeave={rh.onMouseLeaveRoot}
                   onMouseDown={rh.onMouseDownRoot}>
                   <div className={rh.clsHint()}>{rh.childStrHint()}</div>
                 </div>;
          }`
      ),
    ]);

    const merged = await mergeFiles(componentByUuid, "pid", () =>
      Promise.resolve(baseInfo)
    );
    expect(merged?.size).toEqual(1);
    expect(merged?.get("comp1")).toEqual(
      formatted(`
      import React, {ReactNode} from "react";
      import { hasVariant, DefaultFlexStack, FlexStack } from "@plasmicapp/react-web";

      import {
        PlasmicCodeSandboxDialogContent__RenderHelper,
        PlasmicCodeSandboxDialogContent__VariantsArgs,
        PlasmicCodeSandboxDialogContent__VariantsType,
        PlasmicCodeSandboxDialogContent__TriggerStateType
      } from "./PP__CodeSandboxDialogContent"; // plasmic-import: f68b061e-0f85-41c1-8707-3ba9f634f1af/render
      import Button from "../Button"; // plasmic-import: 4SYnkOQLd5/component
      import { PlasmicButton__VariantsArgs } from "../../../plasmic/PlasmicButton"; // plasmic-import: 4SYnkOQLd5/renderer
      import Dropdown from "./Dropdown"; // plasmic-import: a200b79f-288d-4306-be99-e5fd221b8ba6/component
      import { PlasmicDropdown__VariantsArgs } from "./PP__Dropdown"; // plasmic-import: a200b79f-288d-4306-be99-e5fd221b8ba6/renderer
      import DropdownItem from "./DropdownItem"; // plasmic-import: f4c2f0bb-8dce-49c7-a106-65abe9e70e51/component
      import { PlasmicDropdownItem__VariantsArgs } from "./PP__DropdownItem"; // plasmic-import: f4c2f0bb-8dce-49c7-a106-65abe9e70e51/renderer
      import IconButton from "../../IconButton"; // plasmic-import: cfe92-5RW/component
      import { PlasmicIconButton__VariantsArgs } from "../../../plasmic/PlasmicIconButton"; // plasmic-import: cfe92-5RW/renderer
      import * as antd from "antd"; // plasmic-import: the-uuid/jsBundle

      function Comp1() {
        // plasmic-managed-start
        const rh = new PlasmicTreeRow__RenderHelper(variants, args, props.className);
        // plasmic-managed-end

        // plasmic-managed-jsx/3
        return <div
            className={rh.clsNewRoot()}
            onMouseEnter={rh.onMouseEnterNewRoot}
            onMouseLeave={() => {
              rh.onMouseLeaveNewRoot();
              myEventHandler();
            }}
            onClick={handleClick}>
            Hello World
            <div className={rh.clsHint()}>{rh.childStrHint()}</div>
           </div>;
      }`)
    );
  });

  it("mergeFiles should work when base is missing", async function () {
    const componentByUuid = new Map<string, ComponentInfoForMerge>();
    componentByUuid.set("comp1", {
      // edited version of the code, i.e. the entire file.
      editedFile: `
      import React, { ReactNode } from "react";
      import { hasVariant, DefaultFlexStack, FlexStack } from "@plasmicapp/react-web";

      function Comp1() {
        const rh = new PlasmicTreeRow__RenderHelper(variants, args, props.className);

        // plasmic-managed-jsx/2
        return (<div className={rh.clsRoot()} onClick={handleClick}>
          Hello
        </div>);
      }`,
      newFile: `
      import { hasVariant, DefaultFlexStack, FlexStack } from "@plasmicapp/react-web";

      function Comp1() {
        const rh = new PlasmicTreeRow__RenderHelper(variants, args, props.className);

        // plasmic-managed-jsx/3
        return (<div className={rh.clsRoot()}>
          World
        </div>);
      }`,
      // map for newCode
      newNameInIdToUuid: new Map([["NewRoot", "Root"]]),
    });

    const warningInfos = new Map<string, WarningInfo>();
    const merged = await mergeFiles(
      componentByUuid,
      "pid",
      () => Promise.reject("no metadata"),
      undefined,
      true,
      warningInfos
    );
    expect(merged?.size).toEqual(1);
    expect(merged?.get("comp1")).toEqual(
      formatted(`
      import React, {ReactNode} from "react";
      import { hasVariant, DefaultFlexStack, FlexStack } from "@plasmicapp/react-web";

      function Comp1() {
        const rh = new PlasmicTreeRow__RenderHelper(variants, args, props.className);

        // plasmic-managed-jsx/2
        return (<div className={rh.clsRoot()} onClick={handleClick}>
          Hello
        </div>);
      }

      // Please perform merge with the following JSX manually.
      \`// plasmic-managed-jsx/3
  return (<div className={rh.clsRoot()}>World</div>;);\`
      `)
    );
    expect(warningInfos.size).toBe(1);
    expect(warningInfos.get("comp1")?.rawWarnings().length).toBe(1);
  });

  it("mergeFiles should generate warning for secondary nodes", async function () {
    const componentByUuid = new Map<string, ComponentInfoForMerge>();
    componentByUuid.set("comp1", {
      // edited version of the code, i.e. the entire file.
      editedFile: `
      import React, { ReactNode } from "react";
      import { hasVariant, DefaultFlexStack, FlexStack } from "@plasmicapp/react-web";

      function Comp1() {
        const rh = new PlasmicTreeRow__RenderHelper(variants, args, props.className);

        // plasmic-managed-jsx/2
        return (<div className={rh.clsRoot()} onClick={handleClick}>
          <>
            <img className={rh.clsImg1()} />
            <img className={rh.clsImg2()} />
          </>
        </div>);
      }`,
      newFile: `
      import { hasVariant, DefaultFlexStack, FlexStack } from "@plasmicapp/react-web";

      function Comp1() {
        const rh = new PlasmicTreeRow__RenderHelper(variants, args, props.className);

        // plasmic-managed-jsx/3
        return (<div className={rh.clsRoot()}>
          <img className={rh.clsImg1()} {...rh.propsImg1()}/>
          <img className={rh.clsImg2()} {...rh.propsImg2()}/>
        </div>);
      }`,
      // map for newCode
      newNameInIdToUuid: new Map([
        ["Root", "1"],
        ["Img1", "2"],
        ["Img2", "3"],
      ]),
    });

    const baseInfo = new ProjectSyncMetadataModel([
      new ComponentSkeletonModel(
        "comp1",
        new Map([
          ["Root", "1"],
          ["Img1", "2"],
          ["Img2", "3"],
        ]),
        `
        import React, { ReactNode } from "react";
      import { hasVariant, DefaultFlexStack, FlexStack } from "@plasmicapp/react-web";

      function Comp1() {
        const rh = new PlasmicTreeRow__RenderHelper(variants, args, props.className);

        // plasmic-managed-jsx/2
        return (<div className={rh.clsRoot()}>
            <img className={rh.clsImg1()} />
            <img className={rh.clsImg2()} />
          </div>);
      }`
      ),
    ]);

    const warningInfos = new Map<string, WarningInfo>();
    const merged = await mergeFiles(
      componentByUuid,
      "pid",
      () => Promise.resolve(baseInfo),
      undefined,
      true,
      warningInfos
    );
    expect(merged?.size).toEqual(1);
    expect(merged?.get("comp1")).toEqual(
      formatted(`
      import React, { ReactNode } from "react";
      import { hasVariant, DefaultFlexStack, FlexStack } from "@plasmicapp/react-web";

      function Comp1() {
        const rh = new PlasmicTreeRow__RenderHelper(variants, args, props.className);

        // plasmic-managed-jsx/3
        return (<div className={rh.clsRoot()} onClick={handleClick}>
          <>
            <img className={rh.clsImg1()} {...rh.propsImg1()} />
            <img className={rh.clsImg2()} {...rh.propsImg2()} />
          </>
        </div>);
      }`)
    );
    expect(warningInfos.size).toBe(1);
    expect(
      warningInfos.get("comp1")?.secondaryNodes()[0]?.jsxElement.nameInId
    ).toEqual("Img2");
  });

  it("mergeFiles should work for real case", async function () {
    const componentByUuid = new Map<string, ComponentInfoForMerge>();
    const nameInIdToUuid = new Map<string, string>([
      ["Root", "Oz-F5C0WGXN"],
      ["LeftIconSlots", "sKbPJ8fWkM1"],
      ["Triangle", "i6n7PKYuGNj"],
      ["9MoAVl56zyD", "9MoAVl56zyD"],
      ["Type", "_QNTnDc_j61"],
      ["TZ4YvnJs1m0", "TZ4YvnJs1m0"],
      ["WJT3dUu2L1W", "WJT3dUu2L1W"],
      ["LabelSlot", "9lGLLbeby4I"],
      ["$slotLabel", "Gq5p747FfXZ"],
      ["8931QcJ2RU2", "8931QcJ2RU2"],
      ["RightIconSlots", "y1kg2VDXYYI"],
      ["Display", "hc8CIIePquV"],
      ["GgSsc5c_XYW", "ggSsc5c_XYW"],
      ["More", "ZlFyfu63cGO"],
      ["NskLZmZ2M3D", "NskLZmZ2M3D"],
    ]);
    componentByUuid.set("comp1", {
      // edited version of the code, i.e. the entire file.
      editedFile: `
        // This is a skeleton starter React component generated by Plasmic.
        import React, { ReactNode } from "react";
        import PlasmicTreeRow, {
          PlasmicTreeRow__RenderHelper,
          PlasmicTreeRow__VariantsArgs,
          PlasmicTreeRow__VariantsType,
          PlasmicTreeRow__TriggerStateType as TriggerStateType
        } from "../gen/PlasmicTreeRow";
        import { hasVariant, DefaultFlexStack, FlexStack } from "@plasmicapp/react-web";

        interface TreeRowProps {
          label?: ReactNode;
          type?: ReactNode;
          triangle?: ReactNode;
          display?: ReactNode;
          more?: ReactNode;
          types?: PlasmicTreeRow__VariantsArgs["types"];
          states?: PlasmicTreeRow__VariantsArgs["states"];

          // Required className prop is used for positioning this component
          className?: string;
        }

        function TreeRow(props: TreeRowProps) {
          const variants = { types: props.types, states: props.states };
          const args = {
            label: props.label,
            type: props.type,
            triangle: props.triangle,
            display: props.display,
            more: props.more
          };
          const myVar = 1;
          const rh = new PlasmicTreeRow__RenderHelper(variants, args, props.className);

          // plasmic-managed-jsx/66
          return (
            <DefaultFlexStack {...rh.propsRoot()}>
              <div className={rh.clsLeftIconSlots()}>
                {args.triangle || <div {...rh.props9MoAVl56zyD()} />}
                {args.type || (
                  <>
                    {rh.showTZ4YvnJs1m0() && <div {...rh.propsTZ4YvnJs1m0()} />}
                    {rh.showWJT3dUu2L1W() && <div {...rh.propsWJT3dUu2L1W()} />}
                  </>
                )}
              </div>
              <PlasmicSlot className={rh.cls$slotLabel()}
                value={args.label}
                defaultContent={"Tree Row Label"}>
                </PlasmicSlot>
                <DefaultFlexStack className={rh.clsRightIconSlots()}>
                  {args.display || <div {...rh.propsGgSsc5c_XYW()} />}
                  {args.more || <div {...rh.propsNskLZmZ2M3D()} />}
                </DefaultFlexStack>
              </DefaultFlexStack>
            );
          }

          export default TreeRow as React.FunctionComponent<TreeRowProps>;`,
      newFile: `
        // This is a skeleton starter React component generated by Plasmic.
        import React, { ReactNode } from "react";
        import {
          PlasmicTreeRow__RenderHelper,
          PlasmicTreeRow__VariantsArgs,
          PlasmicTreeRow__VariantsType,
          PlasmicTreeRow__TriggerStateType
        } from "../gen/PlasmicTreeRow";
        import {PersonalAccessToken} from "../gen/PersonalAccessToken";
        import { hasVariant, DefaultFlexStack, FlexStack } from "@plasmicapp/react-web";

        interface TreeRowProps {
          label?: ReactNode;
          type?: ReactNode;
          triangle?: ReactNode;
          display?: ReactNode;
          more?: ReactNode;
          types?: PlasmicTreeRow__VariantsArgs["types"];
          states?: PlasmicTreeRow__VariantsArgs["states"];

          // Required className prop is used for positioning this component
          className?: string;
        }

        function TreeRow(props: TreeRowProps) {
          const variants = { types: props.types, states: props.states };
          const args = {
            label: props.label,
            type: props.type,
            triangle: props.triangle,
            display: props.display,
            more: props.more
          };

          const rh = new PlasmicTreeRow__RenderHelper(variants, args, props.className);

          // plasmic-managed-jsx/66
          return (
            <DefaultFlexStack {...rh.propsRoot()}>
              <div className={rh.clsLeftIconSlots()}>
                {args.triangle || <div {...rh.props9MoAVl56zyD()} />}
                {args.type || (
                  <>
                    {rh.showTZ4YvnJs1m0() && <div {...rh.propsTZ4YvnJs1m0()} />}
                    {rh.showWJT3dUu2L1W() && <div {...rh.propsWJT3dUu2L1W()} />}
                  </>
                )}
              </div>
              <PlasmicSlot className={rh.cls$slotLabel()}
                value={args.label}
                defaultContent={"Tree Row Label"}>
                </PlasmicSlot>
                <DefaultFlexStack className={rh.clsRightIconSlots()}>
                  {args.display || <div {...rh.propsGgSsc5c_XYW()} />}
                  {args.more || <div {...rh.propsNskLZmZ2M3D()} />}
                </DefaultFlexStack>
              </DefaultFlexStack>
            );
          }

          export default TreeRow as React.FunctionComponent<TreeRowProps>;`,
      // map for newCode
      newNameInIdToUuid: nameInIdToUuid,
    });

    const baseInfo = new ProjectSyncMetadataModel([
      new ComponentSkeletonModel(
        "comp1",
        nameInIdToUuid,
        `
        // This is a skeleton starter React component generated by Plasmic.
        import React, { ReactNode } from "react";
        import {
          PlasmicTreeRow__RenderHelper,
          PlasmicTreeRow__VariantsArgs,
          PlasmicTreeRow__VariantsType,
          PlasmicTreeRow__TriggerStateType
        } from "../gen/PlasmicTreeRow"; // plasmic-import: rxCVTHM-KfP/render

        import { hasVariant, DefaultFlexStack, FlexStack } from "@plasmicapp/react-web";

        interface TreeRowProps {
          label?: ReactNode;
          type?: ReactNode;
          triangle?: ReactNode;
          display?: ReactNode;
          more?: ReactNode;
          types?: PlasmicTreeRow__VariantsArgs["types"];
          states?: PlasmicTreeRow__VariantsArgs["states"];

          // Required className prop is used for positioning this component
          className?: string;
        }

        function TreeRow(props: TreeRowProps) {
          const variants = { types: props.types, states: props.states };
          const args = {
            label: props.label,
            type: props.type,
            triangle: props.triangle,
            display: props.display,
            more: props.more
          };
          const rh = new PlasmicTreeRow__RenderHelper(variants, args, props.className);

          // plasmic-managed-jsx/66
          return (
            <DefaultFlexStack {...rh.propsRoot()}>
              <div className={rh.clsLeftIconSlots()}>
                {args.triangle || <div {...rh.props9MoAVl56zyD()} />}
                {args.type || (
                  <>
                    {rh.showTZ4YvnJs1m0() && <div {...rh.propsTZ4YvnJs1m0()} />}
                    {rh.showWJT3dUu2L1W() && <div {...rh.propsWJT3dUu2L1W()} />}
                  </>
                )}
              </div>
              <PlasmicSlot className={rh.cls$slotLabel()}
                value={args.label}
                defaultContent={"Tree Row Label"}>
                </PlasmicSlot>
                <DefaultFlexStack className={rh.clsRightIconSlots()}>
                  {args.display || <div {...rh.propsGgSsc5c_XYW()} />}
                  {args.more || <div {...rh.propsNskLZmZ2M3D()} />}
                </DefaultFlexStack>
              </DefaultFlexStack>
            );
          }

          export default TreeRow as React.FunctionComponent<TreeRowProps>;`
      ),
    ]);

    const merged = await mergeFiles(componentByUuid, "pid", () =>
      Promise.resolve(baseInfo)
    );
    expect(merged?.size).toEqual(1);
    expect(merged?.get("comp1")).toEqual(
      formatted(`
        // This is a skeleton starter React component generated by Plasmic.
        import React, { ReactNode } from "react";
        import PlasmicTreeRow, {
          PlasmicTreeRow__RenderHelper,
          PlasmicTreeRow__VariantsArgs,
          PlasmicTreeRow__VariantsType,
          PlasmicTreeRow__TriggerStateType as TriggerStateType,
          PlasmicTreeRow__TriggerStateType
        } from "../gen/PlasmicTreeRow";
        import { hasVariant, DefaultFlexStack, FlexStack } from "@plasmicapp/react-web";
        import {PersonalAccessToken} from "../gen/PersonalAccessToken";

        interface TreeRowProps {
          label?: ReactNode;
          type?: ReactNode;
          triangle?: ReactNode;
          display?: ReactNode;
          more?: ReactNode;
          types?: PlasmicTreeRow__VariantsArgs["types"];
          states?: PlasmicTreeRow__VariantsArgs["states"];

          // Required className prop is used for positioning this component
          className?: string;
        }

        function TreeRow(props: TreeRowProps) {
          const variants = { types: props.types, states: props.states };
          const args = {
            label: props.label,
            type: props.type,
            triangle: props.triangle,
            display: props.display,
            more: props.more
          };

          const myVar = 1;
          const rh = new PlasmicTreeRow__RenderHelper(variants, args, props.className);

          // plasmic-managed-jsx/66
          return (
            <DefaultFlexStack {...rh.propsRoot()}>
              <div className={rh.clsLeftIconSlots()}>
                {args.triangle || <div {...rh.props9MoAVl56zyD()} />}
                {args.type || (
                  <>
                    {rh.showTZ4YvnJs1m0() && <div {...rh.propsTZ4YvnJs1m0()} />}
                    {rh.showWJT3dUu2L1W() && <div {...rh.propsWJT3dUu2L1W()} />}
                  </>
                )}
              </div>
              <PlasmicSlot className={rh.cls$slotLabel()}
                value={args.label}
                defaultContent={"Tree Row Label"}>
                </PlasmicSlot>
                <DefaultFlexStack className={rh.clsRightIconSlots()}>
                  {args.display || <div {...rh.propsGgSsc5c_XYW()} />}
                  {args.more || <div {...rh.propsNskLZmZ2M3D()} />}
                </DefaultFlexStack>
              </DefaultFlexStack>
            );
          }

          export default TreeRow as React.FunctionComponent<TreeRowProps>;`)
    );
  });
});
