import { renameArenaCommand } from "@/wab/client/commands/arena/renameArena";
import { addNewStateVariableCommand } from "@/wab/client/commands/component/addNewStateVariable";
import { changeStateInitialValueCommand } from "@/wab/client/commands/component/changeStateInitialValue";
import { changeStateVariableAccessTypeCommand } from "@/wab/client/commands/component/changeStateVariableAccessType";
import { changeStateVariableNameCommand } from "@/wab/client/commands/component/changeStateVariableName";
import { changeStateVariableTypeCommand } from "@/wab/client/commands/component/changeStateVariableType";
import { removeStateVariableCommand } from "@/wab/client/commands/component/removeStateVariable";
import { resetStateValueCommand } from "@/wab/client/commands/component/resetStateValue";
import { setEditableByContentEditorCommand } from "@/wab/client/commands/component/settings/setEditableByContentEditor";
import { setHiddenFromContentEditorCommand } from "@/wab/client/commands/component/settings/setHiddenFromContentEditor";
import { setTrapFocusCommand } from "@/wab/client/commands/component/settings/setTrapFocus";
import { renameCommand } from "@/wab/client/commands/element/rename";
import { switchArenaCommand } from "@/wab/client/commands/navigation/switchArena";
import { addTokenCommand } from "@/wab/client/commands/token/addToken";

export const COMMANDS = {
  navigation: {
    switchArena: switchArenaCommand,
  },
  arena: {
    renameArena: renameArenaCommand,
  },
  component: {
    addNewStateVariable: addNewStateVariableCommand,
    removeStateVariable: removeStateVariableCommand,
    resetStateValue: resetStateValueCommand,
    changeStateInitialValue: changeStateInitialValueCommand,
    changeStateVariableName: changeStateVariableNameCommand,
    changeStateVariableType: changeStateVariableTypeCommand,
    changeStateVariableAccessType: changeStateVariableAccessTypeCommand,
    settings: {
      setHiddenFromContentEditor: setHiddenFromContentEditorCommand,
      setEditableByContentEditor: setEditableByContentEditorCommand,
      setTrapFocus: setTrapFocusCommand,
    },
  },
  element: {
    rename: renameCommand,
  },
  token: {
    addToken: addTokenCommand,
  },
};
