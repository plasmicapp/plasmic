/**
 * Group of tags and props such that all of those props
 * are common to all of those tags.
 */
interface ReactMetaClique {
  tags: string[];
  keys: number[];
}

export interface CompressedReactMeta {
  key2prop: { [key: number]: any };
  tag2keys: { [tag: string]: number[] };
  largeCliques: ReactMetaClique[];
}

export const compressedReactMetaString = `{
  "key2prop": {
    "1": {
      "name": "about",
      "type": "string",
      "origin": "HTMLAttributes.about"
    },
    "2": {
      "name": "accessKey",
      "type": "string",
      "origin": "HTMLAttributes.accessKey"
    },
    "3": {
      "name": "aria-activedescendant",
      "type": "string",
      "origin": "AriaAttributes.'aria-activedescendant'"
    },
    "4": {
      "name": "aria-atomic",
      "origin": "AriaAttributes.'aria-atomic'"
    },
    "5": {
      "name": "aria-autocomplete",
      "origin": "AriaAttributes.'aria-autocomplete'"
    },
    "6": {
      "name": "aria-busy",
      "origin": "AriaAttributes.'aria-busy'"
    },
    "7": {
      "name": "aria-checked",
      "origin": "AriaAttributes.'aria-checked'"
    },
    "8": {
      "name": "aria-colcount",
      "type": "number",
      "origin": "AriaAttributes.'aria-colcount'"
    },
    "9": {
      "name": "aria-colindex",
      "type": "number",
      "origin": "AriaAttributes.'aria-colindex'"
    },
    "10": {
      "name": "aria-colspan",
      "type": "number",
      "origin": "AriaAttributes.'aria-colspan'"
    },
    "11": {
      "name": "aria-controls",
      "type": "string",
      "origin": "AriaAttributes.'aria-controls'"
    },
    "12": {
      "name": "aria-current",
      "origin": "AriaAttributes.'aria-current'"
    },
    "13": {
      "name": "aria-describedby",
      "type": "string",
      "origin": "AriaAttributes.'aria-describedby'"
    },
    "14": {
      "name": "aria-details",
      "type": "string",
      "origin": "AriaAttributes.'aria-details'"
    },
    "15": {
      "name": "aria-disabled",
      "origin": "AriaAttributes.'aria-disabled'"
    },
    "16": {
      "name": "aria-dropeffect",
      "origin": "AriaAttributes.'aria-dropeffect'"
    },
    "17": {
      "name": "aria-errormessage",
      "type": "string",
      "origin": "AriaAttributes.'aria-errormessage'"
    },
    "18": {
      "name": "aria-expanded",
      "origin": "AriaAttributes.'aria-expanded'"
    },
    "19": {
      "name": "aria-flowto",
      "type": "string",
      "origin": "AriaAttributes.'aria-flowto'"
    },
    "20": {
      "name": "aria-grabbed",
      "origin": "AriaAttributes.'aria-grabbed'"
    },
    "21": {
      "name": "aria-haspopup",
      "origin": "AriaAttributes.'aria-haspopup'"
    },
    "22": {
      "name": "aria-hidden",
      "origin": "AriaAttributes.'aria-hidden'"
    },
    "23": {
      "name": "aria-invalid",
      "origin": "AriaAttributes.'aria-invalid'"
    },
    "24": {
      "name": "aria-keyshortcuts",
      "type": "string",
      "origin": "AriaAttributes.'aria-keyshortcuts'"
    },
    "25": {
      "name": "aria-label",
      "type": "string",
      "origin": "AriaAttributes.'aria-label'"
    },
    "26": {
      "name": "aria-labelledby",
      "type": "string",
      "origin": "AriaAttributes.'aria-labelledby'"
    },
    "27": {
      "name": "aria-level",
      "type": "number",
      "origin": "AriaAttributes.'aria-level'"
    },
    "28": {
      "name": "aria-live",
      "origin": "AriaAttributes.'aria-live'"
    },
    "29": {
      "name": "aria-modal",
      "origin": "AriaAttributes.'aria-modal'"
    },
    "30": {
      "name": "aria-multiline",
      "origin": "AriaAttributes.'aria-multiline'"
    },
    "31": {
      "name": "aria-multiselectable",
      "origin": "AriaAttributes.'aria-multiselectable'"
    },
    "32": {
      "name": "aria-orientation",
      "origin": "AriaAttributes.'aria-orientation'"
    },
    "33": {
      "name": "aria-owns",
      "type": "string",
      "origin": "AriaAttributes.'aria-owns'"
    },
    "34": {
      "name": "aria-placeholder",
      "type": "string",
      "origin": "AriaAttributes.'aria-placeholder'"
    },
    "35": {
      "name": "aria-posinset",
      "type": "number",
      "origin": "AriaAttributes.'aria-posinset'"
    },
    "36": {
      "name": "aria-pressed",
      "origin": "AriaAttributes.'aria-pressed'"
    },
    "37": {
      "name": "aria-readonly",
      "origin": "AriaAttributes.'aria-readonly'"
    },
    "38": {
      "name": "aria-relevant",
      "origin": "AriaAttributes.'aria-relevant'"
    },
    "39": {
      "name": "aria-required",
      "origin": "AriaAttributes.'aria-required'"
    },
    "40": {
      "name": "aria-roledescription",
      "type": "string",
      "origin": "AriaAttributes.'aria-roledescription'"
    },
    "41": {
      "name": "aria-rowcount",
      "type": "number",
      "origin": "AriaAttributes.'aria-rowcount'"
    },
    "42": {
      "name": "aria-rowindex",
      "type": "number",
      "origin": "AriaAttributes.'aria-rowindex'"
    },
    "43": {
      "name": "aria-rowspan",
      "type": "number",
      "origin": "AriaAttributes.'aria-rowspan'"
    },
    "44": {
      "name": "aria-selected",
      "origin": "AriaAttributes.'aria-selected'"
    },
    "45": {
      "name": "aria-setsize",
      "type": "number",
      "origin": "AriaAttributes.'aria-setsize'"
    },
    "46": {
      "name": "aria-sort",
      "origin": "AriaAttributes.'aria-sort'"
    },
    "47": {
      "name": "aria-valuemax",
      "type": "number",
      "origin": "AriaAttributes.'aria-valuemax'"
    },
    "48": {
      "name": "aria-valuemin",
      "type": "number",
      "origin": "AriaAttributes.'aria-valuemin'"
    },
    "49": {
      "name": "aria-valuenow",
      "type": "number",
      "origin": "AriaAttributes.'aria-valuenow'"
    },
    "50": {
      "name": "aria-valuetext",
      "type": "string",
      "origin": "AriaAttributes.'aria-valuetext'"
    },
    "51": {
      "name": "autoCapitalize",
      "type": "string",
      "origin": "HTMLAttributes.autoCapitalize"
    },
    "52": {
      "name": "autoCorrect",
      "type": "string",
      "origin": "HTMLAttributes.autoCorrect"
    },
    "53": {
      "name": "autoSave",
      "type": "string",
      "origin": "HTMLAttributes.autoSave"
    },
    "54": {
      "name": "children",
      "type": "ReactNode",
      "origin": "DOMAttributes.children"
    },
    "55": {
      "name": "className",
      "type": "string",
      "origin": "HTMLAttributes.className"
    },
    "56": {
      "name": "color",
      "type": "string",
      "origin": "HTMLAttributes.color"
    },
    "57": {
      "name": "contentEditable",
      "origin": "HTMLAttributes.contentEditable"
    },
    "58": {
      "name": "contextMenu",
      "type": "string",
      "origin": "HTMLAttributes.contextMenu"
    },
    "59": {
      "name": "dangerouslySetInnerHTML",
      "origin": "DOMAttributes.dangerouslySetInnerHTML"
    },
    "60": {
      "name": "datatype",
      "type": "string",
      "origin": "HTMLAttributes.datatype"
    },
    "61": {
      "name": "defaultChecked",
      "type": "boolean",
      "origin": "HTMLAttributes.defaultChecked"
    },
    "62": {
      "name": "defaultValue",
      "origin": "HTMLAttributes.defaultValue"
    },
    "63": {
      "name": "dir",
      "type": "string",
      "origin": "HTMLAttributes.dir"
    },
    "64": {
      "name": "download",
      "type": "any",
      "origin": null
    },
    "65": {
      "name": "draggable",
      "type": "Booleanish",
      "origin": "HTMLAttributes.draggable"
    },
    "66": {
      "name": "hidden",
      "type": "boolean",
      "origin": "HTMLAttributes.hidden"
    },
    "67": {
      "name": "href",
      "type": "href",
      "origin": null
    },
    "68": {
      "name": "hrefLang",
      "type": "string",
      "origin": null
    },
    "69": {
      "name": "id",
      "type": "string",
      "origin": "HTMLAttributes.id"
    },
    "70": {
      "name": "inlist",
      "type": "any",
      "origin": "HTMLAttributes.inlist"
    },
    "71": {
      "name": "inputMode",
      "origin": "HTMLAttributes.inputMode"
    },
    "72": {
      "name": "is",
      "type": "string",
      "origin": "HTMLAttributes.is"
    },
    "73": {
      "name": "itemID",
      "type": "string",
      "origin": "HTMLAttributes.itemID"
    },
    "74": {
      "name": "itemProp",
      "type": "string",
      "origin": "HTMLAttributes.itemProp"
    },
    "75": {
      "name": "itemRef",
      "type": "string",
      "origin": "HTMLAttributes.itemRef"
    },
    "76": {
      "name": "itemScope",
      "type": "boolean",
      "origin": "HTMLAttributes.itemScope"
    },
    "77": {
      "name": "itemType",
      "type": "string",
      "origin": "HTMLAttributes.itemType"
    },
    "78": {
      "name": "lang",
      "type": "string",
      "origin": "HTMLAttributes.lang"
    },
    "79": {
      "name": "media",
      "type": "string",
      "origin": null
    },
    "80": {
      "name": "onAbort",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onAbort"
    },
    "81": {
      "name": "onAbortCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onAbortCapture"
    },
    "82": {
      "name": "onAnimationEnd",
      "type": "AnimationEventHandler",
      "origin": "DOMAttributes.onAnimationEnd"
    },
    "83": {
      "name": "onAnimationEndCapture",
      "type": "AnimationEventHandler",
      "origin": "DOMAttributes.onAnimationEndCapture"
    },
    "84": {
      "name": "onAnimationIteration",
      "type": "AnimationEventHandler",
      "origin": "DOMAttributes.onAnimationIteration"
    },
    "85": {
      "name": "onAnimationIterationCapture",
      "type": "AnimationEventHandler",
      "origin": "DOMAttributes.onAnimationIterationCapture"
    },
    "86": {
      "name": "onAnimationStart",
      "type": "AnimationEventHandler",
      "origin": "DOMAttributes.onAnimationStart"
    },
    "87": {
      "name": "onAnimationStartCapture",
      "type": "AnimationEventHandler",
      "origin": "DOMAttributes.onAnimationStartCapture"
    },
    "88": {
      "name": "onAuxClick",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onAuxClick"
    },
    "89": {
      "name": "onAuxClickCapture",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onAuxClickCapture"
    },
    "90": {
      "name": "onBeforeInput",
      "type": "FormEventHandler",
      "origin": "DOMAttributes.onBeforeInput"
    },
    "91": {
      "name": "onBeforeInputCapture",
      "type": "FormEventHandler",
      "origin": "DOMAttributes.onBeforeInputCapture"
    },
    "92": {
      "name": "onBlur",
      "type": "FocusEventHandler",
      "origin": "DOMAttributes.onBlur"
    },
    "93": {
      "name": "onBlurCapture",
      "type": "FocusEventHandler",
      "origin": "DOMAttributes.onBlurCapture"
    },
    "94": {
      "name": "onCanPlay",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onCanPlay"
    },
    "95": {
      "name": "onCanPlayCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onCanPlayCapture"
    },
    "96": {
      "name": "onCanPlayThrough",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onCanPlayThrough"
    },
    "97": {
      "name": "onCanPlayThroughCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onCanPlayThroughCapture"
    },
    "98": {
      "name": "onChange",
      "type": "FormEventHandler",
      "origin": "DOMAttributes.onChange"
    },
    "99": {
      "name": "onChangeCapture",
      "type": "FormEventHandler",
      "origin": "DOMAttributes.onChangeCapture"
    },
    "100": {
      "name": "onClick",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onClick"
    },
    "101": {
      "name": "onClickCapture",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onClickCapture"
    },
    "102": {
      "name": "onCompositionEnd",
      "type": "CompositionEventHandler",
      "origin": "DOMAttributes.onCompositionEnd"
    },
    "103": {
      "name": "onCompositionEndCapture",
      "type": "CompositionEventHandler",
      "origin": "DOMAttributes.onCompositionEndCapture"
    },
    "104": {
      "name": "onCompositionStart",
      "type": "CompositionEventHandler",
      "origin": "DOMAttributes.onCompositionStart"
    },
    "105": {
      "name": "onCompositionStartCapture",
      "type": "CompositionEventHandler",
      "origin": "DOMAttributes.onCompositionStartCapture"
    },
    "106": {
      "name": "onCompositionUpdate",
      "type": "CompositionEventHandler",
      "origin": "DOMAttributes.onCompositionUpdate"
    },
    "107": {
      "name": "onCompositionUpdateCapture",
      "type": "CompositionEventHandler",
      "origin": "DOMAttributes.onCompositionUpdateCapture"
    },
    "108": {
      "name": "onContextMenu",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onContextMenu"
    },
    "109": {
      "name": "onContextMenuCapture",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onContextMenuCapture"
    },
    "110": {
      "name": "onCopy",
      "type": "ClipboardEventHandler",
      "origin": "DOMAttributes.onCopy"
    },
    "111": {
      "name": "onCopyCapture",
      "type": "ClipboardEventHandler",
      "origin": "DOMAttributes.onCopyCapture"
    },
    "112": {
      "name": "onCut",
      "type": "ClipboardEventHandler",
      "origin": "DOMAttributes.onCut"
    },
    "113": {
      "name": "onCutCapture",
      "type": "ClipboardEventHandler",
      "origin": "DOMAttributes.onCutCapture"
    },
    "114": {
      "name": "onDoubleClick",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onDoubleClick"
    },
    "115": {
      "name": "onDoubleClickCapture",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onDoubleClickCapture"
    },
    "116": {
      "name": "onDrag",
      "type": "DragEventHandler",
      "origin": "DOMAttributes.onDrag"
    },
    "117": {
      "name": "onDragCapture",
      "type": "DragEventHandler",
      "origin": "DOMAttributes.onDragCapture"
    },
    "118": {
      "name": "onDragEnd",
      "type": "DragEventHandler",
      "origin": "DOMAttributes.onDragEnd"
    },
    "119": {
      "name": "onDragEndCapture",
      "type": "DragEventHandler",
      "origin": "DOMAttributes.onDragEndCapture"
    },
    "120": {
      "name": "onDragEnter",
      "type": "DragEventHandler",
      "origin": "DOMAttributes.onDragEnter"
    },
    "121": {
      "name": "onDragEnterCapture",
      "type": "DragEventHandler",
      "origin": "DOMAttributes.onDragEnterCapture"
    },
    "122": {
      "name": "onDragExit",
      "type": "DragEventHandler",
      "origin": "DOMAttributes.onDragExit"
    },
    "123": {
      "name": "onDragExitCapture",
      "type": "DragEventHandler",
      "origin": "DOMAttributes.onDragExitCapture"
    },
    "124": {
      "name": "onDragLeave",
      "type": "DragEventHandler",
      "origin": "DOMAttributes.onDragLeave"
    },
    "125": {
      "name": "onDragLeaveCapture",
      "type": "DragEventHandler",
      "origin": "DOMAttributes.onDragLeaveCapture"
    },
    "126": {
      "name": "onDragOver",
      "type": "DragEventHandler",
      "origin": "DOMAttributes.onDragOver"
    },
    "127": {
      "name": "onDragOverCapture",
      "type": "DragEventHandler",
      "origin": "DOMAttributes.onDragOverCapture"
    },
    "128": {
      "name": "onDragStart",
      "type": "DragEventHandler",
      "origin": "DOMAttributes.onDragStart"
    },
    "129": {
      "name": "onDragStartCapture",
      "type": "DragEventHandler",
      "origin": "DOMAttributes.onDragStartCapture"
    },
    "130": {
      "name": "onDrop",
      "type": "DragEventHandler",
      "origin": "DOMAttributes.onDrop"
    },
    "131": {
      "name": "onDropCapture",
      "type": "DragEventHandler",
      "origin": "DOMAttributes.onDropCapture"
    },
    "132": {
      "name": "onDurationChange",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onDurationChange"
    },
    "133": {
      "name": "onDurationChangeCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onDurationChangeCapture"
    },
    "134": {
      "name": "onEmptied",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onEmptied"
    },
    "135": {
      "name": "onEmptiedCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onEmptiedCapture"
    },
    "136": {
      "name": "onEncrypted",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onEncrypted"
    },
    "137": {
      "name": "onEncryptedCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onEncryptedCapture"
    },
    "138": {
      "name": "onEnded",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onEnded"
    },
    "139": {
      "name": "onEndedCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onEndedCapture"
    },
    "140": {
      "name": "onError",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onError"
    },
    "141": {
      "name": "onErrorCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onErrorCapture"
    },
    "142": {
      "name": "onFocus",
      "type": "FocusEventHandler",
      "origin": "DOMAttributes.onFocus"
    },
    "143": {
      "name": "onFocusCapture",
      "type": "FocusEventHandler",
      "origin": "DOMAttributes.onFocusCapture"
    },
    "144": {
      "name": "onGotPointerCapture",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onGotPointerCapture"
    },
    "145": {
      "name": "onGotPointerCaptureCapture",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onGotPointerCaptureCapture"
    },
    "146": {
      "name": "onInput",
      "type": "FormEventHandler",
      "origin": "DOMAttributes.onInput"
    },
    "147": {
      "name": "onInputCapture",
      "type": "FormEventHandler",
      "origin": "DOMAttributes.onInputCapture"
    },
    "148": {
      "name": "onInvalid",
      "type": "FormEventHandler",
      "origin": "DOMAttributes.onInvalid"
    },
    "149": {
      "name": "onInvalidCapture",
      "type": "FormEventHandler",
      "origin": "DOMAttributes.onInvalidCapture"
    },
    "150": {
      "name": "onKeyDown",
      "type": "KeyboardEventHandler",
      "origin": "DOMAttributes.onKeyDown"
    },
    "151": {
      "name": "onKeyDownCapture",
      "type": "KeyboardEventHandler",
      "origin": "DOMAttributes.onKeyDownCapture"
    },
    "152": {
      "name": "onKeyPress",
      "type": "KeyboardEventHandler",
      "origin": "DOMAttributes.onKeyPress"
    },
    "153": {
      "name": "onKeyPressCapture",
      "type": "KeyboardEventHandler",
      "origin": "DOMAttributes.onKeyPressCapture"
    },
    "154": {
      "name": "onKeyUp",
      "type": "KeyboardEventHandler",
      "origin": "DOMAttributes.onKeyUp"
    },
    "155": {
      "name": "onKeyUpCapture",
      "type": "KeyboardEventHandler",
      "origin": "DOMAttributes.onKeyUpCapture"
    },
    "156": {
      "name": "onLoad",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onLoad"
    },
    "157": {
      "name": "onLoadCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onLoadCapture"
    },
    "158": {
      "name": "onLoadStart",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onLoadStart"
    },
    "159": {
      "name": "onLoadStartCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onLoadStartCapture"
    },
    "160": {
      "name": "onLoadedData",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onLoadedData"
    },
    "161": {
      "name": "onLoadedDataCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onLoadedDataCapture"
    },
    "162": {
      "name": "onLoadedMetadata",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onLoadedMetadata"
    },
    "163": {
      "name": "onLoadedMetadataCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onLoadedMetadataCapture"
    },
    "164": {
      "name": "onLostPointerCapture",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onLostPointerCapture"
    },
    "165": {
      "name": "onLostPointerCaptureCapture",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onLostPointerCaptureCapture"
    },
    "166": {
      "name": "onMouseDown",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onMouseDown"
    },
    "167": {
      "name": "onMouseDownCapture",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onMouseDownCapture"
    },
    "168": {
      "name": "onMouseEnter",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onMouseEnter"
    },
    "169": {
      "name": "onMouseLeave",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onMouseLeave"
    },
    "170": {
      "name": "onMouseMove",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onMouseMove"
    },
    "171": {
      "name": "onMouseMoveCapture",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onMouseMoveCapture"
    },
    "172": {
      "name": "onMouseOut",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onMouseOut"
    },
    "173": {
      "name": "onMouseOutCapture",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onMouseOutCapture"
    },
    "174": {
      "name": "onMouseOver",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onMouseOver"
    },
    "175": {
      "name": "onMouseOverCapture",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onMouseOverCapture"
    },
    "176": {
      "name": "onMouseUp",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onMouseUp"
    },
    "177": {
      "name": "onMouseUpCapture",
      "type": "MouseEventHandler",
      "origin": "DOMAttributes.onMouseUpCapture"
    },
    "178": {
      "name": "onPaste",
      "type": "ClipboardEventHandler",
      "origin": "DOMAttributes.onPaste"
    },
    "179": {
      "name": "onPasteCapture",
      "type": "ClipboardEventHandler",
      "origin": "DOMAttributes.onPasteCapture"
    },
    "180": {
      "name": "onPause",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onPause"
    },
    "181": {
      "name": "onPauseCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onPauseCapture"
    },
    "182": {
      "name": "onPlay",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onPlay"
    },
    "183": {
      "name": "onPlayCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onPlayCapture"
    },
    "184": {
      "name": "onPlaying",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onPlaying"
    },
    "185": {
      "name": "onPlayingCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onPlayingCapture"
    },
    "186": {
      "name": "onPointerCancel",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onPointerCancel"
    },
    "187": {
      "name": "onPointerCancelCapture",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onPointerCancelCapture"
    },
    "188": {
      "name": "onPointerDown",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onPointerDown"
    },
    "189": {
      "name": "onPointerDownCapture",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onPointerDownCapture"
    },
    "190": {
      "name": "onPointerEnter",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onPointerEnter"
    },
    "191": {
      "name": "onPointerEnterCapture",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onPointerEnterCapture"
    },
    "192": {
      "name": "onPointerLeave",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onPointerLeave"
    },
    "193": {
      "name": "onPointerLeaveCapture",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onPointerLeaveCapture"
    },
    "194": {
      "name": "onPointerMove",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onPointerMove"
    },
    "195": {
      "name": "onPointerMoveCapture",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onPointerMoveCapture"
    },
    "196": {
      "name": "onPointerOut",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onPointerOut"
    },
    "197": {
      "name": "onPointerOutCapture",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onPointerOutCapture"
    },
    "198": {
      "name": "onPointerOver",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onPointerOver"
    },
    "199": {
      "name": "onPointerOverCapture",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onPointerOverCapture"
    },
    "200": {
      "name": "onPointerUp",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onPointerUp"
    },
    "201": {
      "name": "onPointerUpCapture",
      "type": "PointerEventHandler",
      "origin": "DOMAttributes.onPointerUpCapture"
    },
    "202": {
      "name": "onProgress",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onProgress"
    },
    "203": {
      "name": "onProgressCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onProgressCapture"
    },
    "204": {
      "name": "onRateChange",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onRateChange"
    },
    "205": {
      "name": "onRateChangeCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onRateChangeCapture"
    },
    "206": {
      "name": "onReset",
      "type": "FormEventHandler",
      "origin": "DOMAttributes.onReset"
    },
    "207": {
      "name": "onResetCapture",
      "type": "FormEventHandler",
      "origin": "DOMAttributes.onResetCapture"
    },
    "208": {
      "name": "onScroll",
      "type": "UIEventHandler",
      "origin": "DOMAttributes.onScroll"
    },
    "209": {
      "name": "onScrollCapture",
      "type": "UIEventHandler",
      "origin": "DOMAttributes.onScrollCapture"
    },
    "210": {
      "name": "onSeeked",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onSeeked"
    },
    "211": {
      "name": "onSeekedCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onSeekedCapture"
    },
    "212": {
      "name": "onSeeking",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onSeeking"
    },
    "213": {
      "name": "onSeekingCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onSeekingCapture"
    },
    "214": {
      "name": "onSelect",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onSelect"
    },
    "215": {
      "name": "onSelectCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onSelectCapture"
    },
    "216": {
      "name": "onStalled",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onStalled"
    },
    "217": {
      "name": "onStalledCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onStalledCapture"
    },
    "218": {
      "name": "onSubmit",
      "type": "FormEventHandler",
      "origin": "DOMAttributes.onSubmit"
    },
    "219": {
      "name": "onSubmitCapture",
      "type": "FormEventHandler",
      "origin": "DOMAttributes.onSubmitCapture"
    },
    "220": {
      "name": "onSuspend",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onSuspend"
    },
    "221": {
      "name": "onSuspendCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onSuspendCapture"
    },
    "222": {
      "name": "onTimeUpdate",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onTimeUpdate"
    },
    "223": {
      "name": "onTimeUpdateCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onTimeUpdateCapture"
    },
    "224": {
      "name": "onTouchCancel",
      "type": "TouchEventHandler",
      "origin": "DOMAttributes.onTouchCancel"
    },
    "225": {
      "name": "onTouchCancelCapture",
      "type": "TouchEventHandler",
      "origin": "DOMAttributes.onTouchCancelCapture"
    },
    "226": {
      "name": "onTouchEnd",
      "type": "TouchEventHandler",
      "origin": "DOMAttributes.onTouchEnd"
    },
    "227": {
      "name": "onTouchEndCapture",
      "type": "TouchEventHandler",
      "origin": "DOMAttributes.onTouchEndCapture"
    },
    "228": {
      "name": "onTouchMove",
      "type": "TouchEventHandler",
      "origin": "DOMAttributes.onTouchMove"
    },
    "229": {
      "name": "onTouchMoveCapture",
      "type": "TouchEventHandler",
      "origin": "DOMAttributes.onTouchMoveCapture"
    },
    "230": {
      "name": "onTouchStart",
      "type": "TouchEventHandler",
      "origin": "DOMAttributes.onTouchStart"
    },
    "231": {
      "name": "onTouchStartCapture",
      "type": "TouchEventHandler",
      "origin": "DOMAttributes.onTouchStartCapture"
    },
    "232": {
      "name": "onTransitionEnd",
      "type": "TransitionEventHandler",
      "origin": "DOMAttributes.onTransitionEnd"
    },
    "233": {
      "name": "onTransitionEndCapture",
      "type": "TransitionEventHandler",
      "origin": "DOMAttributes.onTransitionEndCapture"
    },
    "234": {
      "name": "onVolumeChange",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onVolumeChange"
    },
    "235": {
      "name": "onVolumeChangeCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onVolumeChangeCapture"
    },
    "236": {
      "name": "onWaiting",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onWaiting"
    },
    "237": {
      "name": "onWaitingCapture",
      "type": "ReactEventHandler",
      "origin": "DOMAttributes.onWaitingCapture"
    },
    "238": {
      "name": "onWheel",
      "type": "WheelEventHandler",
      "origin": "DOMAttributes.onWheel"
    },
    "239": {
      "name": "onWheelCapture",
      "type": "WheelEventHandler",
      "origin": "DOMAttributes.onWheelCapture"
    },
    "240": {
      "name": "ping",
      "type": "string",
      "origin": null
    },
    "241": {
      "name": "placeholder",
      "type": "string",
      "origin": "HTMLAttributes.placeholder"
    },
    "242": {
      "name": "prefix",
      "type": "string",
      "origin": "HTMLAttributes.prefix"
    },
    "243": {
      "name": "property",
      "type": "string",
      "origin": "HTMLAttributes.property"
    },
    "244": {
      "name": "radioGroup",
      "type": "string",
      "origin": "HTMLAttributes.radioGroup"
    },
    "245": {
      "name": "referrerPolicy",
      "type": "string",
      "origin": null
    },
    "246": {
      "name": "rel",
      "type": "string",
      "origin": null
    },
    "247": {
      "name": "resource",
      "type": "string",
      "origin": "HTMLAttributes.resource"
    },
    "248": {
      "name": "results",
      "type": "number",
      "origin": "HTMLAttributes.results"
    },
    "249": {
      "name": "role",
      "type": "string",
      "origin": "HTMLAttributes.role"
    },
    "250": {
      "name": "security",
      "type": "string",
      "origin": "HTMLAttributes.security"
    },
    "251": {
      "name": "slot",
      "type": "string",
      "origin": "HTMLAttributes.slot"
    },
    "252": {
      "name": "spellCheck",
      "type": "Booleanish",
      "origin": "HTMLAttributes.spellCheck"
    },
    "253": {
      "name": "style",
      "type": "CSSProperties",
      "origin": "HTMLAttributes.style"
    },
    "254": {
      "name": "suppressContentEditableWarning",
      "type": "boolean",
      "origin": "HTMLAttributes.suppressContentEditableWarning"
    },
    "255": {
      "name": "suppressHydrationWarning",
      "type": "boolean",
      "origin": "HTMLAttributes.suppressHydrationWarning"
    },
    "256": {
      "name": "tabIndex",
      "type": "number",
      "origin": "HTMLAttributes.tabIndex"
    },
    "257": {
      "name": "target",
      "type": "target",
      "origin": null
    },
    "258": {
      "name": "title",
      "type": "string",
      "origin": "HTMLAttributes.title"
    },
    "259": {
      "name": "translate",
      "origin": "HTMLAttributes.translate"
    },
    "260": {
      "name": "type",
      "type": "string",
      "origin": null
    },
    "261": {
      "name": "typeof",
      "type": "string",
      "origin": "HTMLAttributes.typeof"
    },
    "262": {
      "name": "unselectable",
      "origin": "HTMLAttributes.unselectable"
    },
    "263": {
      "name": "vocab",
      "type": "string",
      "origin": "HTMLAttributes.vocab"
    },
    "264": {
      "name": "about",
      "type": "string",
      "origin": null
    },
    "265": {
      "name": "accessKey",
      "type": "string",
      "origin": null
    },
    "266": {
      "name": "autoCapitalize",
      "type": "string",
      "origin": null
    },
    "267": {
      "name": "autoCorrect",
      "type": "string",
      "origin": null
    },
    "268": {
      "name": "autoSave",
      "type": "string",
      "origin": null
    },
    "269": {
      "name": "className",
      "type": "string",
      "origin": null
    },
    "270": {
      "name": "color",
      "type": "string",
      "origin": null
    },
    "271": {
      "name": "contentEditable",
      "origin": null
    },
    "272": {
      "name": "contextMenu",
      "type": "string",
      "origin": null
    },
    "273": {
      "name": "datatype",
      "type": "string",
      "origin": null
    },
    "274": {
      "name": "defaultChecked",
      "type": "boolean",
      "origin": null
    },
    "275": {
      "name": "defaultValue",
      "origin": null
    },
    "276": {
      "name": "dir",
      "type": "string",
      "origin": null
    },
    "277": {
      "name": "draggable",
      "type": "Booleanish",
      "origin": null
    },
    "278": {
      "name": "hidden",
      "type": "boolean",
      "origin": null
    },
    "279": {
      "name": "id",
      "type": "string",
      "origin": null
    },
    "280": {
      "name": "inlist",
      "type": "any",
      "origin": null
    },
    "281": {
      "name": "inputMode",
      "origin": null
    },
    "282": {
      "name": "is",
      "type": "string",
      "origin": null
    },
    "283": {
      "name": "itemID",
      "type": "string",
      "origin": null
    },
    "284": {
      "name": "itemProp",
      "type": "string",
      "origin": null
    },
    "285": {
      "name": "itemRef",
      "type": "string",
      "origin": null
    },
    "286": {
      "name": "itemScope",
      "type": "boolean",
      "origin": null
    },
    "287": {
      "name": "itemType",
      "type": "string",
      "origin": null
    },
    "288": {
      "name": "lang",
      "type": "string",
      "origin": null
    },
    "289": {
      "name": "placeholder",
      "type": "string",
      "origin": null
    },
    "290": {
      "name": "prefix",
      "type": "string",
      "origin": null
    },
    "291": {
      "name": "property",
      "type": "string",
      "origin": null
    },
    "292": {
      "name": "radioGroup",
      "type": "string",
      "origin": null
    },
    "293": {
      "name": "resource",
      "type": "string",
      "origin": null
    },
    "294": {
      "name": "results",
      "type": "number",
      "origin": null
    },
    "295": {
      "name": "role",
      "type": "string",
      "origin": null
    },
    "296": {
      "name": "security",
      "type": "string",
      "origin": null
    },
    "297": {
      "name": "slot",
      "type": "string",
      "origin": null
    },
    "298": {
      "name": "spellCheck",
      "type": "Booleanish",
      "origin": null
    },
    "299": {
      "name": "style",
      "type": "CSSProperties",
      "origin": null
    },
    "300": {
      "name": "suppressContentEditableWarning",
      "type": "boolean",
      "origin": null
    },
    "301": {
      "name": "suppressHydrationWarning",
      "type": "boolean",
      "origin": null
    },
    "302": {
      "name": "tabIndex",
      "type": "number",
      "origin": null
    },
    "303": {
      "name": "title",
      "type": "string",
      "origin": null
    },
    "304": {
      "name": "translate",
      "origin": null
    },
    "305": {
      "name": "typeof",
      "type": "string",
      "origin": null
    },
    "306": {
      "name": "unselectable",
      "origin": null
    },
    "307": {
      "name": "vocab",
      "type": "string",
      "origin": null
    },
    "308": {
      "name": "accentHeight",
      "origin": "SVGAttributes.accentHeight"
    },
    "309": {
      "name": "accumulate",
      "origin": "SVGAttributes.accumulate"
    },
    "310": {
      "name": "additive",
      "origin": "SVGAttributes.additive"
    },
    "311": {
      "name": "alignmentBaseline",
      "origin": "SVGAttributes.alignmentBaseline"
    },
    "312": {
      "name": "allowReorder",
      "origin": "SVGAttributes.allowReorder"
    },
    "313": {
      "name": "alphabetic",
      "origin": "SVGAttributes.alphabetic"
    },
    "314": {
      "name": "amplitude",
      "origin": "SVGAttributes.amplitude"
    },
    "315": {
      "name": "arabicForm",
      "origin": "SVGAttributes.arabicForm"
    },
    "316": {
      "name": "ascent",
      "origin": "SVGAttributes.ascent"
    },
    "317": {
      "name": "attributeName",
      "type": "string",
      "origin": "SVGAttributes.attributeName"
    },
    "318": {
      "name": "attributeType",
      "type": "string",
      "origin": "SVGAttributes.attributeType"
    },
    "319": {
      "name": "autoReverse",
      "type": "Booleanish",
      "origin": "SVGAttributes.autoReverse"
    },
    "320": {
      "name": "azimuth",
      "origin": "SVGAttributes.azimuth"
    },
    "321": {
      "name": "baseFrequency",
      "origin": "SVGAttributes.baseFrequency"
    },
    "322": {
      "name": "baseProfile",
      "origin": "SVGAttributes.baseProfile"
    },
    "323": {
      "name": "baselineShift",
      "origin": "SVGAttributes.baselineShift"
    },
    "324": {
      "name": "bbox",
      "origin": "SVGAttributes.bbox"
    },
    "325": {
      "name": "begin",
      "origin": "SVGAttributes.begin"
    },
    "326": {
      "name": "bias",
      "origin": "SVGAttributes.bias"
    },
    "327": {
      "name": "by",
      "origin": "SVGAttributes.by"
    },
    "328": {
      "name": "calcMode",
      "origin": "SVGAttributes.calcMode"
    },
    "329": {
      "name": "capHeight",
      "origin": "SVGAttributes.capHeight"
    },
    "330": {
      "name": "className",
      "type": "string",
      "origin": "SVGAttributes.className"
    },
    "331": {
      "name": "clip",
      "origin": "SVGAttributes.clip"
    },
    "332": {
      "name": "clipPath",
      "type": "string",
      "origin": "SVGAttributes.clipPath"
    },
    "333": {
      "name": "clipPathUnits",
      "origin": "SVGAttributes.clipPathUnits"
    },
    "334": {
      "name": "clipRule",
      "origin": "SVGAttributes.clipRule"
    },
    "335": {
      "name": "color",
      "type": "string",
      "origin": "SVGAttributes.color"
    },
    "336": {
      "name": "colorInterpolation",
      "origin": "SVGAttributes.colorInterpolation"
    },
    "337": {
      "name": "colorInterpolationFilters",
      "origin": "SVGAttributes.colorInterpolationFilters"
    },
    "338": {
      "name": "colorProfile",
      "origin": "SVGAttributes.colorProfile"
    },
    "339": {
      "name": "colorRendering",
      "origin": "SVGAttributes.colorRendering"
    },
    "340": {
      "name": "contentScriptType",
      "origin": "SVGAttributes.contentScriptType"
    },
    "341": {
      "name": "contentStyleType",
      "origin": "SVGAttributes.contentStyleType"
    },
    "342": {
      "name": "crossOrigin",
      "origin": "SVGAttributes.crossOrigin"
    },
    "343": {
      "name": "cursor",
      "origin": "SVGAttributes.cursor"
    },
    "344": {
      "name": "cx",
      "origin": "SVGAttributes.cx"
    },
    "345": {
      "name": "cy",
      "origin": "SVGAttributes.cy"
    },
    "346": {
      "name": "d",
      "type": "string",
      "origin": "SVGAttributes.d"
    },
    "347": {
      "name": "decelerate",
      "origin": "SVGAttributes.decelerate"
    },
    "348": {
      "name": "descent",
      "origin": "SVGAttributes.descent"
    },
    "349": {
      "name": "diffuseConstant",
      "origin": "SVGAttributes.diffuseConstant"
    },
    "350": {
      "name": "direction",
      "origin": "SVGAttributes.direction"
    },
    "351": {
      "name": "display",
      "origin": "SVGAttributes.display"
    },
    "352": {
      "name": "divisor",
      "origin": "SVGAttributes.divisor"
    },
    "353": {
      "name": "dominantBaseline",
      "origin": "SVGAttributes.dominantBaseline"
    },
    "354": {
      "name": "dur",
      "origin": "SVGAttributes.dur"
    },
    "355": {
      "name": "dx",
      "origin": "SVGAttributes.dx"
    },
    "356": {
      "name": "dy",
      "origin": "SVGAttributes.dy"
    },
    "357": {
      "name": "edgeMode",
      "origin": "SVGAttributes.edgeMode"
    },
    "358": {
      "name": "elevation",
      "origin": "SVGAttributes.elevation"
    },
    "359": {
      "name": "enableBackground",
      "origin": "SVGAttributes.enableBackground"
    },
    "360": {
      "name": "end",
      "origin": "SVGAttributes.end"
    },
    "361": {
      "name": "exponent",
      "origin": "SVGAttributes.exponent"
    },
    "362": {
      "name": "externalResourcesRequired",
      "type": "Booleanish",
      "origin": "SVGAttributes.externalResourcesRequired"
    },
    "363": {
      "name": "fill",
      "type": "string",
      "origin": "SVGAttributes.fill"
    },
    "364": {
      "name": "fillOpacity",
      "origin": "SVGAttributes.fillOpacity"
    },
    "365": {
      "name": "fillRule",
      "origin": "SVGAttributes.fillRule"
    },
    "366": {
      "name": "filter",
      "type": "string",
      "origin": "SVGAttributes.filter"
    },
    "367": {
      "name": "filterRes",
      "origin": "SVGAttributes.filterRes"
    },
    "368": {
      "name": "filterUnits",
      "origin": "SVGAttributes.filterUnits"
    },
    "369": {
      "name": "floodColor",
      "origin": "SVGAttributes.floodColor"
    },
    "370": {
      "name": "floodOpacity",
      "origin": "SVGAttributes.floodOpacity"
    },
    "371": {
      "name": "focusable",
      "origin": "SVGAttributes.focusable"
    },
    "372": {
      "name": "fontFamily",
      "type": "string",
      "origin": "SVGAttributes.fontFamily"
    },
    "373": {
      "name": "fontSize",
      "origin": "SVGAttributes.fontSize"
    },
    "374": {
      "name": "fontSizeAdjust",
      "origin": "SVGAttributes.fontSizeAdjust"
    },
    "375": {
      "name": "fontStretch",
      "origin": "SVGAttributes.fontStretch"
    },
    "376": {
      "name": "fontStyle",
      "origin": "SVGAttributes.fontStyle"
    },
    "377": {
      "name": "fontVariant",
      "origin": "SVGAttributes.fontVariant"
    },
    "378": {
      "name": "fontWeight",
      "origin": "SVGAttributes.fontWeight"
    },
    "379": {
      "name": "format",
      "origin": "SVGAttributes.format"
    },
    "380": {
      "name": "from",
      "origin": "SVGAttributes.from"
    },
    "381": {
      "name": "fx",
      "origin": "SVGAttributes.fx"
    },
    "382": {
      "name": "fy",
      "origin": "SVGAttributes.fy"
    },
    "383": {
      "name": "g1",
      "origin": "SVGAttributes.g1"
    },
    "384": {
      "name": "g2",
      "origin": "SVGAttributes.g2"
    },
    "385": {
      "name": "glyphName",
      "origin": "SVGAttributes.glyphName"
    },
    "386": {
      "name": "glyphOrientationHorizontal",
      "origin": "SVGAttributes.glyphOrientationHorizontal"
    },
    "387": {
      "name": "glyphOrientationVertical",
      "origin": "SVGAttributes.glyphOrientationVertical"
    },
    "388": {
      "name": "glyphRef",
      "origin": "SVGAttributes.glyphRef"
    },
    "389": {
      "name": "gradientTransform",
      "type": "string",
      "origin": "SVGAttributes.gradientTransform"
    },
    "390": {
      "name": "gradientUnits",
      "type": "string",
      "origin": "SVGAttributes.gradientUnits"
    },
    "391": {
      "name": "hanging",
      "origin": "SVGAttributes.hanging"
    },
    "392": {
      "name": "height",
      "origin": "SVGAttributes.height"
    },
    "393": {
      "name": "horizAdvX",
      "origin": "SVGAttributes.horizAdvX"
    },
    "394": {
      "name": "horizOriginX",
      "origin": "SVGAttributes.horizOriginX"
    },
    "395": {
      "name": "href",
      "type": "string",
      "origin": "SVGAttributes.href"
    },
    "396": {
      "name": "id",
      "type": "string",
      "origin": "SVGAttributes.id"
    },
    "397": {
      "name": "ideographic",
      "origin": "SVGAttributes.ideographic"
    },
    "398": {
      "name": "imageRendering",
      "origin": "SVGAttributes.imageRendering"
    },
    "399": {
      "name": "in",
      "type": "string",
      "origin": "SVGAttributes.in"
    },
    "400": {
      "name": "in2",
      "origin": "SVGAttributes.in2"
    },
    "401": {
      "name": "intercept",
      "origin": "SVGAttributes.intercept"
    },
    "402": {
      "name": "k",
      "origin": "SVGAttributes.k"
    },
    "403": {
      "name": "k1",
      "origin": "SVGAttributes.k1"
    },
    "404": {
      "name": "k2",
      "origin": "SVGAttributes.k2"
    },
    "405": {
      "name": "k3",
      "origin": "SVGAttributes.k3"
    },
    "406": {
      "name": "k4",
      "origin": "SVGAttributes.k4"
    },
    "407": {
      "name": "kernelMatrix",
      "origin": "SVGAttributes.kernelMatrix"
    },
    "408": {
      "name": "kernelUnitLength",
      "origin": "SVGAttributes.kernelUnitLength"
    },
    "409": {
      "name": "kerning",
      "origin": "SVGAttributes.kerning"
    },
    "410": {
      "name": "key",
      "type": "Key",
      "origin": "Attributes.key"
    },
    "411": {
      "name": "keyPoints",
      "origin": "SVGAttributes.keyPoints"
    },
    "412": {
      "name": "keySplines",
      "origin": "SVGAttributes.keySplines"
    },
    "413": {
      "name": "keyTimes",
      "origin": "SVGAttributes.keyTimes"
    },
    "414": {
      "name": "lang",
      "type": "string",
      "origin": "SVGAttributes.lang"
    },
    "415": {
      "name": "lengthAdjust",
      "origin": "SVGAttributes.lengthAdjust"
    },
    "416": {
      "name": "letterSpacing",
      "origin": "SVGAttributes.letterSpacing"
    },
    "417": {
      "name": "lightingColor",
      "origin": "SVGAttributes.lightingColor"
    },
    "418": {
      "name": "limitingConeAngle",
      "origin": "SVGAttributes.limitingConeAngle"
    },
    "419": {
      "name": "local",
      "origin": "SVGAttributes.local"
    },
    "420": {
      "name": "markerEnd",
      "type": "string",
      "origin": "SVGAttributes.markerEnd"
    },
    "421": {
      "name": "markerHeight",
      "origin": "SVGAttributes.markerHeight"
    },
    "422": {
      "name": "markerMid",
      "type": "string",
      "origin": "SVGAttributes.markerMid"
    },
    "423": {
      "name": "markerStart",
      "type": "string",
      "origin": "SVGAttributes.markerStart"
    },
    "424": {
      "name": "markerUnits",
      "origin": "SVGAttributes.markerUnits"
    },
    "425": {
      "name": "markerWidth",
      "origin": "SVGAttributes.markerWidth"
    },
    "426": {
      "name": "mask",
      "type": "string",
      "origin": "SVGAttributes.mask"
    },
    "427": {
      "name": "maskContentUnits",
      "origin": "SVGAttributes.maskContentUnits"
    },
    "428": {
      "name": "maskUnits",
      "origin": "SVGAttributes.maskUnits"
    },
    "429": {
      "name": "mathematical",
      "origin": "SVGAttributes.mathematical"
    },
    "430": {
      "name": "max",
      "origin": "SVGAttributes.max"
    },
    "431": {
      "name": "media",
      "type": "string",
      "origin": "SVGAttributes.media"
    },
    "432": {
      "name": "method",
      "type": "string",
      "origin": "SVGAttributes.method"
    },
    "433": {
      "name": "min",
      "origin": "SVGAttributes.min"
    },
    "434": {
      "name": "mode",
      "origin": "SVGAttributes.mode"
    },
    "435": {
      "name": "name",
      "type": "string",
      "origin": "SVGAttributes.name"
    },
    "436": {
      "name": "numOctaves",
      "origin": "SVGAttributes.numOctaves"
    },
    "437": {
      "name": "offset",
      "origin": "SVGAttributes.offset"
    },
    "438": {
      "name": "opacity",
      "origin": "SVGAttributes.opacity"
    },
    "439": {
      "name": "operator",
      "origin": "SVGAttributes.operator"
    },
    "440": {
      "name": "order",
      "origin": "SVGAttributes.order"
    },
    "441": {
      "name": "orient",
      "origin": "SVGAttributes.orient"
    },
    "442": {
      "name": "orientation",
      "origin": "SVGAttributes.orientation"
    },
    "443": {
      "name": "origin",
      "origin": "SVGAttributes.origin"
    },
    "444": {
      "name": "overflow",
      "origin": "SVGAttributes.overflow"
    },
    "445": {
      "name": "overlinePosition",
      "origin": "SVGAttributes.overlinePosition"
    },
    "446": {
      "name": "overlineThickness",
      "origin": "SVGAttributes.overlineThickness"
    },
    "447": {
      "name": "paintOrder",
      "origin": "SVGAttributes.paintOrder"
    },
    "448": {
      "name": "panose1",
      "origin": "SVGAttributes.panose1"
    },
    "449": {
      "name": "path",
      "type": "string",
      "origin": "SVGAttributes.path"
    },
    "450": {
      "name": "pathLength",
      "origin": "SVGAttributes.pathLength"
    },
    "451": {
      "name": "patternContentUnits",
      "type": "string",
      "origin": "SVGAttributes.patternContentUnits"
    },
    "452": {
      "name": "patternTransform",
      "origin": "SVGAttributes.patternTransform"
    },
    "453": {
      "name": "patternUnits",
      "type": "string",
      "origin": "SVGAttributes.patternUnits"
    },
    "454": {
      "name": "pointerEvents",
      "origin": "SVGAttributes.pointerEvents"
    },
    "455": {
      "name": "points",
      "type": "string",
      "origin": "SVGAttributes.points"
    },
    "456": {
      "name": "pointsAtX",
      "origin": "SVGAttributes.pointsAtX"
    },
    "457": {
      "name": "pointsAtY",
      "origin": "SVGAttributes.pointsAtY"
    },
    "458": {
      "name": "pointsAtZ",
      "origin": "SVGAttributes.pointsAtZ"
    },
    "459": {
      "name": "preserveAlpha",
      "type": "Booleanish",
      "origin": "SVGAttributes.preserveAlpha"
    },
    "460": {
      "name": "preserveAspectRatio",
      "type": "string",
      "origin": "SVGAttributes.preserveAspectRatio"
    },
    "461": {
      "name": "primitiveUnits",
      "origin": "SVGAttributes.primitiveUnits"
    },
    "462": {
      "name": "r",
      "origin": "SVGAttributes.r"
    },
    "463": {
      "name": "radius",
      "origin": "SVGAttributes.radius"
    },
    "464": {
      "name": "ref",
      "type": "LegacyRef",
      "origin": "ClassAttributes.ref"
    },
    "465": {
      "name": "refX",
      "origin": "SVGAttributes.refX"
    },
    "466": {
      "name": "refY",
      "origin": "SVGAttributes.refY"
    },
    "467": {
      "name": "renderingIntent",
      "origin": "SVGAttributes.renderingIntent"
    },
    "468": {
      "name": "repeatCount",
      "origin": "SVGAttributes.repeatCount"
    },
    "469": {
      "name": "repeatDur",
      "origin": "SVGAttributes.repeatDur"
    },
    "470": {
      "name": "requiredExtensions",
      "origin": "SVGAttributes.requiredExtensions"
    },
    "471": {
      "name": "requiredFeatures",
      "origin": "SVGAttributes.requiredFeatures"
    },
    "472": {
      "name": "restart",
      "origin": "SVGAttributes.restart"
    },
    "473": {
      "name": "result",
      "type": "string",
      "origin": "SVGAttributes.result"
    },
    "474": {
      "name": "role",
      "type": "string",
      "origin": "SVGAttributes.role"
    },
    "475": {
      "name": "rotate",
      "origin": "SVGAttributes.rotate"
    },
    "476": {
      "name": "rx",
      "origin": "SVGAttributes.rx"
    },
    "477": {
      "name": "ry",
      "origin": "SVGAttributes.ry"
    },
    "478": {
      "name": "scale",
      "origin": "SVGAttributes.scale"
    },
    "479": {
      "name": "seed",
      "origin": "SVGAttributes.seed"
    },
    "480": {
      "name": "shapeRendering",
      "origin": "SVGAttributes.shapeRendering"
    },
    "481": {
      "name": "slope",
      "origin": "SVGAttributes.slope"
    },
    "482": {
      "name": "spacing",
      "origin": "SVGAttributes.spacing"
    },
    "483": {
      "name": "specularConstant",
      "origin": "SVGAttributes.specularConstant"
    },
    "484": {
      "name": "specularExponent",
      "origin": "SVGAttributes.specularExponent"
    },
    "485": {
      "name": "speed",
      "origin": "SVGAttributes.speed"
    },
    "486": {
      "name": "spreadMethod",
      "type": "string",
      "origin": "SVGAttributes.spreadMethod"
    },
    "487": {
      "name": "startOffset",
      "origin": "SVGAttributes.startOffset"
    },
    "488": {
      "name": "stdDeviation",
      "origin": "SVGAttributes.stdDeviation"
    },
    "489": {
      "name": "stemh",
      "origin": "SVGAttributes.stemh"
    },
    "490": {
      "name": "stemv",
      "origin": "SVGAttributes.stemv"
    },
    "491": {
      "name": "stitchTiles",
      "origin": "SVGAttributes.stitchTiles"
    },
    "492": {
      "name": "stopColor",
      "type": "string",
      "origin": "SVGAttributes.stopColor"
    },
    "493": {
      "name": "stopOpacity",
      "origin": "SVGAttributes.stopOpacity"
    },
    "494": {
      "name": "strikethroughPosition",
      "origin": "SVGAttributes.strikethroughPosition"
    },
    "495": {
      "name": "strikethroughThickness",
      "origin": "SVGAttributes.strikethroughThickness"
    },
    "496": {
      "name": "string",
      "origin": "SVGAttributes.string"
    },
    "497": {
      "name": "stroke",
      "type": "string",
      "origin": "SVGAttributes.stroke"
    },
    "498": {
      "name": "strokeDasharray",
      "origin": "SVGAttributes.strokeDasharray"
    },
    "499": {
      "name": "strokeDashoffset",
      "origin": "SVGAttributes.strokeDashoffset"
    },
    "500": {
      "name": "strokeLinecap",
      "origin": "SVGAttributes.strokeLinecap"
    },
    "501": {
      "name": "strokeLinejoin",
      "origin": "SVGAttributes.strokeLinejoin"
    },
    "502": {
      "name": "strokeMiterlimit",
      "origin": "SVGAttributes.strokeMiterlimit"
    },
    "503": {
      "name": "strokeOpacity",
      "origin": "SVGAttributes.strokeOpacity"
    },
    "504": {
      "name": "strokeWidth",
      "origin": "SVGAttributes.strokeWidth"
    },
    "505": {
      "name": "style",
      "type": "CSSProperties",
      "origin": "SVGAttributes.style"
    },
    "506": {
      "name": "surfaceScale",
      "origin": "SVGAttributes.surfaceScale"
    },
    "507": {
      "name": "systemLanguage",
      "origin": "SVGAttributes.systemLanguage"
    },
    "508": {
      "name": "tabIndex",
      "type": "number",
      "origin": "SVGAttributes.tabIndex"
    },
    "509": {
      "name": "tableValues",
      "origin": "SVGAttributes.tableValues"
    },
    "510": {
      "name": "target",
      "type": "string",
      "origin": "SVGAttributes.target"
    },
    "511": {
      "name": "targetX",
      "origin": "SVGAttributes.targetX"
    },
    "512": {
      "name": "targetY",
      "origin": "SVGAttributes.targetY"
    },
    "513": {
      "name": "textAnchor",
      "type": "string",
      "origin": "SVGAttributes.textAnchor"
    },
    "514": {
      "name": "textDecoration",
      "origin": "SVGAttributes.textDecoration"
    },
    "515": {
      "name": "textLength",
      "origin": "SVGAttributes.textLength"
    },
    "516": {
      "name": "textRendering",
      "origin": "SVGAttributes.textRendering"
    },
    "517": {
      "name": "to",
      "origin": "SVGAttributes.to"
    },
    "518": {
      "name": "transform",
      "type": "string",
      "origin": "SVGAttributes.transform"
    },
    "519": {
      "name": "type",
      "type": "string",
      "origin": "SVGAttributes.type"
    },
    "520": {
      "name": "u1",
      "origin": "SVGAttributes.u1"
    },
    "521": {
      "name": "u2",
      "origin": "SVGAttributes.u2"
    },
    "522": {
      "name": "underlinePosition",
      "origin": "SVGAttributes.underlinePosition"
    },
    "523": {
      "name": "underlineThickness",
      "origin": "SVGAttributes.underlineThickness"
    },
    "524": {
      "name": "unicode",
      "origin": "SVGAttributes.unicode"
    },
    "525": {
      "name": "unicodeBidi",
      "origin": "SVGAttributes.unicodeBidi"
    },
    "526": {
      "name": "unicodeRange",
      "origin": "SVGAttributes.unicodeRange"
    },
    "527": {
      "name": "unitsPerEm",
      "origin": "SVGAttributes.unitsPerEm"
    },
    "528": {
      "name": "vAlphabetic",
      "origin": "SVGAttributes.vAlphabetic"
    },
    "529": {
      "name": "vHanging",
      "origin": "SVGAttributes.vHanging"
    },
    "530": {
      "name": "vIdeographic",
      "origin": "SVGAttributes.vIdeographic"
    },
    "531": {
      "name": "vMathematical",
      "origin": "SVGAttributes.vMathematical"
    },
    "532": {
      "name": "values",
      "type": "string",
      "origin": "SVGAttributes.values"
    },
    "533": {
      "name": "vectorEffect",
      "origin": "SVGAttributes.vectorEffect"
    },
    "534": {
      "name": "version",
      "type": "string",
      "origin": "SVGAttributes.version"
    },
    "535": {
      "name": "vertAdvY",
      "origin": "SVGAttributes.vertAdvY"
    },
    "536": {
      "name": "vertOriginX",
      "origin": "SVGAttributes.vertOriginX"
    },
    "537": {
      "name": "vertOriginY",
      "origin": "SVGAttributes.vertOriginY"
    },
    "538": {
      "name": "viewBox",
      "type": "string",
      "origin": "SVGAttributes.viewBox"
    },
    "539": {
      "name": "viewTarget",
      "origin": "SVGAttributes.viewTarget"
    },
    "540": {
      "name": "visibility",
      "origin": "SVGAttributes.visibility"
    },
    "541": {
      "name": "width",
      "origin": "SVGAttributes.width"
    },
    "542": {
      "name": "widths",
      "origin": "SVGAttributes.widths"
    },
    "543": {
      "name": "wordSpacing",
      "origin": "SVGAttributes.wordSpacing"
    },
    "544": {
      "name": "writingMode",
      "origin": "SVGAttributes.writingMode"
    },
    "545": {
      "name": "x",
      "origin": "SVGAttributes.x"
    },
    "546": {
      "name": "x1",
      "origin": "SVGAttributes.x1"
    },
    "547": {
      "name": "x2",
      "origin": "SVGAttributes.x2"
    },
    "548": {
      "name": "xChannelSelector",
      "type": "string",
      "origin": "SVGAttributes.xChannelSelector"
    },
    "549": {
      "name": "xHeight",
      "origin": "SVGAttributes.xHeight"
    },
    "550": {
      "name": "xlinkActuate",
      "type": "string",
      "origin": "SVGAttributes.xlinkActuate"
    },
    "551": {
      "name": "xlinkArcrole",
      "type": "string",
      "origin": "SVGAttributes.xlinkArcrole"
    },
    "552": {
      "name": "xlinkHref",
      "type": "string",
      "origin": "SVGAttributes.xlinkHref"
    },
    "553": {
      "name": "xlinkRole",
      "type": "string",
      "origin": "SVGAttributes.xlinkRole"
    },
    "554": {
      "name": "xlinkShow",
      "type": "string",
      "origin": "SVGAttributes.xlinkShow"
    },
    "555": {
      "name": "xlinkTitle",
      "type": "string",
      "origin": "SVGAttributes.xlinkTitle"
    },
    "556": {
      "name": "xlinkType",
      "type": "string",
      "origin": "SVGAttributes.xlinkType"
    },
    "557": {
      "name": "xmlBase",
      "type": "string",
      "origin": "SVGAttributes.xmlBase"
    },
    "558": {
      "name": "xmlLang",
      "type": "string",
      "origin": "SVGAttributes.xmlLang"
    },
    "559": {
      "name": "xmlSpace",
      "type": "string",
      "origin": "SVGAttributes.xmlSpace"
    },
    "560": {
      "name": "xmlns",
      "type": "string",
      "origin": "SVGAttributes.xmlns"
    },
    "561": {
      "name": "xmlnsXlink",
      "type": "string",
      "origin": "SVGAttributes.xmlnsXlink"
    },
    "562": {
      "name": "y",
      "origin": "SVGAttributes.y"
    },
    "563": {
      "name": "y1",
      "origin": "SVGAttributes.y1"
    },
    "564": {
      "name": "y2",
      "origin": "SVGAttributes.y2"
    },
    "565": {
      "name": "yChannelSelector",
      "type": "string",
      "origin": "SVGAttributes.yChannelSelector"
    },
    "566": {
      "name": "z",
      "origin": "SVGAttributes.z"
    },
    "567": {
      "name": "zoomAndPan",
      "type": "string",
      "origin": "SVGAttributes.zoomAndPan"
    },
    "568": {
      "name": "alt",
      "type": "string",
      "origin": null
    },
    "569": {
      "name": "coords",
      "type": "string",
      "origin": null
    },
    "570": {
      "name": "href",
      "type": "string",
      "origin": null
    },
    "571": {
      "name": "shape",
      "type": "string",
      "origin": null
    },
    "572": {
      "name": "autoPlay",
      "type": "boolean",
      "origin": "MediaHTMLAttributes.autoPlay"
    },
    "573": {
      "name": "controls",
      "type": "boolean",
      "origin": "MediaHTMLAttributes.controls"
    },
    "574": {
      "name": "controlsList",
      "type": "string",
      "origin": "MediaHTMLAttributes.controlsList"
    },
    "575": {
      "name": "crossOrigin",
      "type": "string",
      "origin": "MediaHTMLAttributes.crossOrigin"
    },
    "576": {
      "name": "loop",
      "type": "boolean",
      "origin": "MediaHTMLAttributes.loop"
    },
    "577": {
      "name": "mediaGroup",
      "type": "string",
      "origin": "MediaHTMLAttributes.mediaGroup"
    },
    "578": {
      "name": "muted",
      "type": "boolean",
      "origin": "MediaHTMLAttributes.muted"
    },
    "579": {
      "name": "playsinline",
      "type": "boolean",
      "origin": "MediaHTMLAttributes.playsinline"
    },
    "580": {
      "name": "preload",
      "type": "string",
      "origin": "MediaHTMLAttributes.preload"
    },
    "581": {
      "name": "src",
      "type": "string",
      "origin": "MediaHTMLAttributes.src"
    },
    "582": {
      "name": "cite",
      "type": "string",
      "origin": null
    },
    "583": {
      "name": "autoFocus",
      "type": "boolean",
      "origin": null
    },
    "584": {
      "name": "disabled",
      "type": "boolean",
      "origin": null
    },
    "585": {
      "name": "form",
      "type": "string",
      "origin": null
    },
    "586": {
      "name": "formAction",
      "type": "string",
      "origin": null
    },
    "587": {
      "name": "formEncType",
      "type": "string",
      "origin": null
    },
    "588": {
      "name": "formMethod",
      "type": "string",
      "origin": null
    },
    "589": {
      "name": "formNoValidate",
      "type": "boolean",
      "origin": null
    },
    "590": {
      "name": "formTarget",
      "type": "string",
      "origin": null
    },
    "591": {
      "name": "name",
      "type": "string",
      "origin": null
    },
    "592": {
      "name": "type",
      "origin": null
    },
    "593": {
      "name": "value",
      "origin": null
    },
    "594": {
      "name": "height",
      "origin": null
    },
    "595": {
      "name": "width",
      "origin": null
    },
    "596": {
      "name": "span",
      "type": "number",
      "origin": null
    },
    "597": {
      "name": "dateTime",
      "type": "string",
      "origin": null
    },
    "598": {
      "name": "open",
      "type": "boolean",
      "origin": null
    },
    "599": {
      "name": "src",
      "type": "string",
      "origin": null
    },
    "600": {
      "name": "acceptCharset",
      "type": "string",
      "origin": null
    },
    "601": {
      "name": "action",
      "type": "string",
      "origin": null
    },
    "602": {
      "name": "autoComplete",
      "type": "string",
      "origin": null
    },
    "603": {
      "name": "encType",
      "type": "string",
      "origin": null
    },
    "604": {
      "name": "method",
      "type": "string",
      "origin": null
    },
    "605": {
      "name": "noValidate",
      "type": "boolean",
      "origin": null
    },
    "606": {
      "name": "manifest",
      "type": "string",
      "origin": null
    },
    "607": {
      "name": "allow",
      "type": "string",
      "origin": null
    },
    "608": {
      "name": "allowFullScreen",
      "type": "boolean",
      "origin": null
    },
    "609": {
      "name": "allowTransparency",
      "type": "boolean",
      "origin": null
    },
    "610": {
      "name": "frameBorder",
      "origin": null
    },
    "611": {
      "name": "marginHeight",
      "type": "number",
      "origin": null
    },
    "612": {
      "name": "marginWidth",
      "type": "number",
      "origin": null
    },
    "613": {
      "name": "sandbox",
      "type": "string",
      "origin": null
    },
    "614": {
      "name": "scrolling",
      "type": "string",
      "origin": null
    },
    "615": {
      "name": "seamless",
      "type": "boolean",
      "origin": null
    },
    "616": {
      "name": "srcDoc",
      "type": "string",
      "origin": null
    },
    "617": {
      "name": "crossOrigin",
      "origin": null
    },
    "618": {
      "name": "decoding",
      "origin": null
    },
    "619": {
      "name": "loading",
      "origin": null
    },
    "620": {
      "name": "referrerPolicy",
      "origin": null
    },
    "621": {
      "name": "sizes",
      "type": "string",
      "origin": null
    },
    "622": {
      "name": "srcSet",
      "type": "string",
      "origin": null
    },
    "623": {
      "name": "useMap",
      "type": "string",
      "origin": null
    },
    "624": {
      "name": "accept",
      "type": "string",
      "origin": null
    },
    "625": {
      "name": "capture",
      "origin": null
    },
    "626": {
      "name": "checked",
      "type": "boolean",
      "origin": null
    },
    "627": {
      "name": "crossOrigin",
      "type": "string",
      "origin": null
    },
    "628": {
      "name": "list",
      "type": "string",
      "origin": null
    },
    "629": {
      "name": "max",
      "origin": null
    },
    "630": {
      "name": "maxLength",
      "type": "number",
      "origin": null
    },
    "631": {
      "name": "min",
      "origin": null
    },
    "632": {
      "name": "minLength",
      "type": "number",
      "origin": null
    },
    "633": {
      "name": "multiple",
      "type": "boolean",
      "origin": null
    },
    "634": {
      "name": "onChange",
      "type": "ChangeEventHandler",
      "origin": null
    },
    "635": {
      "name": "pattern",
      "type": "string",
      "origin": null
    },
    "636": {
      "name": "readOnly",
      "type": "boolean",
      "origin": null
    },
    "637": {
      "name": "required",
      "type": "boolean",
      "origin": null
    },
    "638": {
      "name": "size",
      "type": "number",
      "origin": null
    },
    "639": {
      "name": "step",
      "origin": null
    },
    "640": {
      "name": "challenge",
      "type": "string",
      "origin": null
    },
    "641": {
      "name": "keyParams",
      "type": "string",
      "origin": null
    },
    "642": {
      "name": "keyType",
      "type": "string",
      "origin": null
    },
    "643": {
      "name": "htmlFor",
      "type": "string",
      "origin": null
    },
    "644": {
      "name": "as",
      "type": "string",
      "origin": null
    },
    "645": {
      "name": "integrity",
      "type": "string",
      "origin": null
    },
    "646": {
      "name": "charSet",
      "type": "string",
      "origin": null
    },
    "647": {
      "name": "content",
      "type": "string",
      "origin": null
    },
    "648": {
      "name": "httpEquiv",
      "type": "string",
      "origin": null
    },
    "649": {
      "name": "high",
      "type": "number",
      "origin": null
    },
    "650": {
      "name": "low",
      "type": "number",
      "origin": null
    },
    "651": {
      "name": "optimum",
      "type": "number",
      "origin": null
    },
    "652": {
      "name": "classID",
      "type": "string",
      "origin": null
    },
    "653": {
      "name": "data",
      "type": "string",
      "origin": null
    },
    "654": {
      "name": "wmode",
      "type": "string",
      "origin": null
    },
    "655": {
      "name": "reversed",
      "type": "boolean",
      "origin": null
    },
    "656": {
      "name": "start",
      "type": "number",
      "origin": null
    },
    "657": {
      "name": "label",
      "type": "string",
      "origin": null
    },
    "658": {
      "name": "selected",
      "type": "boolean",
      "origin": null
    },
    "659": {
      "name": "async",
      "type": "boolean",
      "origin": null
    },
    "660": {
      "name": "defer",
      "type": "boolean",
      "origin": null
    },
    "661": {
      "name": "noModule",
      "type": "boolean",
      "origin": null
    },
    "662": {
      "name": "nonce",
      "type": "string",
      "origin": null
    },
    "663": {
      "name": "scoped",
      "type": "boolean",
      "origin": null
    },
    "664": {
      "name": "cellPadding",
      "origin": null
    },
    "665": {
      "name": "cellSpacing",
      "origin": null
    },
    "666": {
      "name": "summary",
      "type": "string",
      "origin": null
    },
    "667": {
      "name": "abbr",
      "type": "string",
      "origin": null
    },
    "668": {
      "name": "align",
      "origin": null
    },
    "669": {
      "name": "colSpan",
      "type": "number",
      "origin": null
    },
    "670": {
      "name": "headers",
      "type": "string",
      "origin": null
    },
    "671": {
      "name": "rowSpan",
      "type": "number",
      "origin": null
    },
    "672": {
      "name": "scope",
      "type": "string",
      "origin": null
    },
    "673": {
      "name": "valign",
      "origin": null
    },
    "674": {
      "name": "cols",
      "type": "number",
      "origin": null
    },
    "675": {
      "name": "dirName",
      "type": "string",
      "origin": null
    },
    "676": {
      "name": "rows",
      "type": "number",
      "origin": null
    },
    "677": {
      "name": "wrap",
      "type": "string",
      "origin": null
    },
    "678": {
      "name": "default",
      "type": "boolean",
      "origin": null
    },
    "679": {
      "name": "kind",
      "type": "string",
      "origin": null
    },
    "680": {
      "name": "srcLang",
      "type": "string",
      "origin": null
    },
    "681": {
      "name": "disablePictureInPicture",
      "type": "boolean",
      "origin": null
    },
    "682": {
      "name": "playsInline",
      "type": "boolean",
      "origin": null
    },
    "683": {
      "name": "poster",
      "type": "string",
      "origin": null
    },
    "684": {
      "name": "allowpopups",
      "type": "boolean",
      "origin": null
    },
    "685": {
      "name": "autosize",
      "type": "boolean",
      "origin": null
    },
    "686": {
      "name": "blinkfeatures",
      "type": "string",
      "origin": null
    },
    "687": {
      "name": "disableblinkfeatures",
      "type": "string",
      "origin": null
    },
    "688": {
      "name": "disableguestresize",
      "type": "boolean",
      "origin": null
    },
    "689": {
      "name": "disablewebsecurity",
      "type": "boolean",
      "origin": null
    },
    "690": {
      "name": "guestinstance",
      "type": "string",
      "origin": null
    },
    "691": {
      "name": "httpreferrer",
      "type": "string",
      "origin": null
    },
    "692": {
      "name": "nodeintegration",
      "type": "boolean",
      "origin": null
    },
    "693": {
      "name": "partition",
      "type": "string",
      "origin": null
    },
    "694": {
      "name": "plugins",
      "type": "boolean",
      "origin": null
    },
    "695": {
      "name": "preload",
      "type": "string",
      "origin": null
    },
    "696": {
      "name": "useragent",
      "type": "string",
      "origin": null
    },
    "697": {
      "name": "webpreferences",
      "type": "string",
      "origin": null
    }
  },
  "tag2keys": {
    "a": [
      64,
      67,
      68,
      79,
      98,
      240,
      241,
      245,
      246,
      257,
      260
    ],
    "abbr": [
      98,
      289
    ],
    "address": [
      98,
      289
    ],
    "animate": [
      98
    ],
    "animateMotion": [
      98
    ],
    "animateTransform": [
      98
    ],
    "area": [
      568,
      569,
      64,
      570,
      68,
      79,
      98,
      241,
      246,
      571,
      257
    ],
    "article": [
      98,
      289
    ],
    "aside": [
      98,
      289
    ],
    "audio": [
      572,
      573,
      574,
      575,
      576,
      577,
      578,
      98,
      241,
      579,
      580,
      581
    ],
    "b": [
      98,
      289
    ],
    "base": [
      570,
      98,
      241,
      257
    ],
    "bdi": [
      98,
      289
    ],
    "bdo": [
      98,
      289
    ],
    "big": [
      98,
      289
    ],
    "blockquote": [
      582,
      98,
      241
    ],
    "body": [
      98,
      289
    ],
    "br": [
      98,
      289
    ],
    "button": [
      583,
      584,
      585,
      586,
      587,
      588,
      589,
      590,
      591,
      98,
      241,
      592,
      593
    ],
    "canvas": [
      594,
      98,
      241,
      595
    ],
    "caption": [
      98,
      289
    ],
    "circle": [
      98
    ],
    "cite": [
      98,
      289
    ],
    "clipPath": [
      98
    ],
    "code": [
      98,
      289
    ],
    "col": [
      98,
      241,
      596,
      595
    ],
    "colgroup": [
      98,
      241,
      596
    ],
    "data": [
      98,
      241,
      593
    ],
    "datalist": [
      98,
      289
    ],
    "dd": [
      98,
      289
    ],
    "defs": [
      98
    ],
    "del": [
      582,
      597,
      98,
      241
    ],
    "desc": [
      98
    ],
    "details": [
      98,
      598,
      241
    ],
    "dfn": [
      98,
      289
    ],
    "dialog": [
      98,
      598,
      241
    ],
    "div": [
      98,
      289
    ],
    "dl": [
      98,
      289
    ],
    "dt": [
      98,
      289
    ],
    "ellipse": [
      98
    ],
    "em": [
      98,
      289
    ],
    "embed": [
      594,
      98,
      241,
      599,
      260,
      595
    ],
    "feBlend": [
      98
    ],
    "feColorMatrix": [
      98
    ],
    "feComponentTransfer": [
      98
    ],
    "feComposite": [
      98
    ],
    "feConvolveMatrix": [
      98
    ],
    "feDiffuseLighting": [
      98
    ],
    "feDisplacementMap": [
      98
    ],
    "feDistantLight": [
      98
    ],
    "feDropShadow": [
      98
    ],
    "feFlood": [
      98
    ],
    "feFuncA": [
      98
    ],
    "feFuncB": [
      98
    ],
    "feFuncG": [
      98
    ],
    "feFuncR": [
      98
    ],
    "feGaussianBlur": [
      98
    ],
    "feImage": [
      98
    ],
    "feMerge": [
      98
    ],
    "feMergeNode": [
      98
    ],
    "feMorphology": [
      98
    ],
    "feOffset": [
      98
    ],
    "fePointLight": [
      98
    ],
    "feSpecularLighting": [
      98
    ],
    "feSpotLight": [
      98
    ],
    "feTile": [
      98
    ],
    "feTurbulence": [
      98
    ],
    "fieldset": [
      584,
      585,
      591,
      98,
      241
    ],
    "figcaption": [
      98,
      289
    ],
    "figure": [
      98,
      289
    ],
    "filter": [
      98
    ],
    "footer": [
      98,
      289
    ],
    "foreignObject": [
      98
    ],
    "form": [
      600,
      601,
      602,
      603,
      604,
      591,
      605,
      98,
      241,
      257
    ],
    "g": [
      98
    ],
    "h1": [
      98,
      289
    ],
    "h2": [
      98,
      289
    ],
    "h3": [
      98,
      289
    ],
    "h4": [
      98,
      289
    ],
    "h5": [
      98,
      289
    ],
    "h6": [
      98,
      289
    ],
    "head": [
      98,
      289
    ],
    "header": [
      98,
      289
    ],
    "hgroup": [
      98,
      289
    ],
    "hr": [
      98,
      289
    ],
    "html": [
      606,
      98,
      241
    ],
    "i": [
      98,
      289
    ],
    "iframe": [
      607,
      608,
      609,
      610,
      594,
      611,
      612,
      591,
      98,
      241,
      245,
      613,
      614,
      615,
      599,
      616,
      595
    ],
    "image": [
      98
    ],
    "img": [
      568,
      617,
      618,
      594,
      619,
      98,
      241,
      620,
      621,
      599,
      622,
      623,
      595
    ],
    "input": [
      624,
      568,
      602,
      583,
      625,
      626,
      627,
      584,
      585,
      586,
      587,
      588,
      589,
      590,
      594,
      628,
      629,
      630,
      631,
      632,
      633,
      591,
      634,
      635,
      289,
      636,
      637,
      638,
      599,
      639,
      260,
      593,
      595
    ],
    "ins": [
      582,
      597,
      98,
      241
    ],
    "kbd": [
      98,
      289
    ],
    "keygen": [
      583,
      640,
      584,
      585,
      641,
      642,
      591,
      98,
      241
    ],
    "label": [
      585,
      643,
      98,
      241
    ],
    "legend": [
      98,
      289
    ],
    "li": [
      98,
      241,
      593
    ],
    "line": [
      98
    ],
    "linearGradient": [
      98
    ],
    "link": [
      644,
      627,
      570,
      68,
      645,
      79,
      98,
      241,
      246,
      621,
      260
    ],
    "main": [
      98,
      289
    ],
    "map": [
      591,
      98,
      241
    ],
    "mark": [
      98,
      289
    ],
    "marker": [
      98
    ],
    "mask": [
      98
    ],
    "menu": [
      98,
      241,
      260
    ],
    "menuitem": [
      98,
      289
    ],
    "meta": [
      646,
      647,
      648,
      591,
      98,
      241
    ],
    "metadata": [
      98
    ],
    "meter": [
      585,
      649,
      650,
      629,
      631,
      98,
      651,
      241,
      593
    ],
    "mpath": [
      98
    ],
    "nav": [
      98,
      289
    ],
    "noindex": [
      98,
      289
    ],
    "noscript": [
      98,
      289
    ],
    "object": [
      652,
      653,
      585,
      594,
      591,
      98,
      241,
      260,
      623,
      595,
      654
    ],
    "ol": [
      98,
      241,
      655,
      656,
      592
    ],
    "optgroup": [
      584,
      657,
      98,
      241
    ],
    "option": [
      584,
      657,
      98,
      241,
      658,
      593
    ],
    "output": [
      585,
      643,
      591,
      98,
      241
    ],
    "p": [
      98,
      289
    ],
    "param": [
      591,
      98,
      241,
      593
    ],
    "path": [
      98
    ],
    "pattern": [
      98
    ],
    "picture": [
      98,
      289
    ],
    "polygon": [
      98
    ],
    "polyline": [
      98
    ],
    "pre": [
      98,
      289
    ],
    "progress": [
      629,
      98,
      241,
      593
    ],
    "q": [
      582,
      98,
      241
    ],
    "radialGradient": [
      98
    ],
    "rect": [
      98
    ],
    "rp": [
      98,
      289
    ],
    "rt": [
      98,
      289
    ],
    "ruby": [
      98,
      289
    ],
    "s": [
      98,
      289
    ],
    "samp": [
      98,
      289
    ],
    "script": [
      659,
      646,
      627,
      660,
      645,
      661,
      662,
      98,
      241,
      599,
      260
    ],
    "section": [
      98,
      289
    ],
    "select": [
      602,
      583,
      584,
      585,
      633,
      591,
      634,
      241,
      637,
      638,
      593
    ],
    "small": [
      98,
      289
    ],
    "source": [
      79,
      98,
      241,
      621,
      599,
      622,
      260
    ],
    "span": [
      98,
      289
    ],
    "stop": [
      98
    ],
    "strong": [
      98,
      289
    ],
    "style": [
      79,
      662,
      98,
      241,
      663,
      260
    ],
    "sub": [
      98,
      289
    ],
    "summary": [
      98,
      289
    ],
    "sup": [
      98,
      289
    ],
    "svg": [
      98
    ],
    "switch": [
      98
    ],
    "symbol": [
      98
    ],
    "table": [
      664,
      665,
      98,
      241,
      666
    ],
    "tbody": [
      98,
      289
    ],
    "td": [
      667,
      668,
      669,
      670,
      98,
      241,
      671,
      672,
      673
    ],
    "template": [
      98,
      289
    ],
    "text": [
      98
    ],
    "textPath": [
      98
    ],
    "textarea": [
      602,
      583,
      674,
      675,
      584,
      585,
      630,
      632,
      591,
      634,
      289,
      636,
      637,
      676,
      593,
      677
    ],
    "tfoot": [
      98,
      289
    ],
    "th": [
      667,
      668,
      669,
      670,
      98,
      241,
      671,
      672
    ],
    "thead": [
      98,
      289
    ],
    "time": [
      597,
      98,
      241
    ],
    "title": [
      98,
      289
    ],
    "tr": [
      98,
      289
    ],
    "track": [
      678,
      679,
      657,
      98,
      241,
      599,
      680
    ],
    "tspan": [
      98
    ],
    "u": [
      98,
      289
    ],
    "ul": [
      98,
      289
    ],
    "use": [
      98
    ],
    "var": [
      98,
      289
    ],
    "video": [
      572,
      573,
      574,
      575,
      681,
      594,
      576,
      577,
      578,
      98,
      241,
      682,
      579,
      683,
      580,
      581,
      595
    ],
    "view": [
      98
    ],
    "wbr": [
      98,
      289
    ],
    "webview": [
      608,
      684,
      583,
      685,
      686,
      687,
      688,
      689,
      690,
      691,
      692,
      98,
      693,
      241,
      694,
      695,
      599,
      696,
      697
    ]
  },
  "largeCliques": [
    {
      "keys": [
        1,
        2,
        51,
        52,
        53,
        55,
        56,
        57,
        58,
        60,
        61,
        62,
        63,
        65,
        66,
        69,
        70,
        71,
        72,
        73,
        74,
        75,
        76,
        77,
        78,
        242,
        243,
        244,
        247,
        248,
        249,
        250,
        251,
        252,
        253,
        254,
        255,
        256,
        258,
        259,
        261,
        262,
        263
      ],
      "tags": [
        "a",
        "area",
        "audio",
        "base",
        "blockquote",
        "button",
        "canvas",
        "col",
        "colgroup",
        "data",
        "del",
        "details",
        "dialog",
        "embed",
        "fieldset",
        "form",
        "html",
        "iframe",
        "img",
        "input",
        "ins",
        "keygen",
        "label",
        "li",
        "link",
        "map",
        "menu",
        "meta",
        "meter",
        "object",
        "ol",
        "optgroup",
        "option",
        "output",
        "param",
        "progress",
        "q",
        "script",
        "select",
        "source",
        "style",
        "table",
        "td",
        "textarea",
        "th",
        "time",
        "track",
        "video",
        "webview"
      ]
    },
    {
      "keys": [
        308,
        309,
        310,
        311,
        312,
        313,
        314,
        315,
        316,
        317,
        318,
        319,
        320,
        321,
        322,
        323,
        324,
        325,
        326,
        327,
        328,
        329,
        330,
        331,
        332,
        333,
        334,
        335,
        336,
        337,
        338,
        339,
        340,
        341,
        342,
        343,
        344,
        345,
        346,
        347,
        348,
        349,
        350,
        351,
        352,
        353,
        354,
        355,
        356,
        357,
        358,
        359,
        360,
        361,
        362,
        363,
        364,
        365,
        366,
        367,
        368,
        369,
        370,
        371,
        372,
        373,
        374,
        375,
        376,
        377,
        378,
        379,
        380,
        381,
        382,
        383,
        384,
        385,
        386,
        387,
        388,
        389,
        390,
        391,
        392,
        393,
        394,
        395,
        396,
        397,
        398,
        399,
        400,
        401,
        402,
        403,
        404,
        405,
        406,
        407,
        408,
        409,
        410,
        411,
        412,
        413,
        414,
        415,
        416,
        417,
        418,
        419,
        420,
        421,
        422,
        423,
        424,
        425,
        426,
        427,
        428,
        429,
        430,
        431,
        432,
        433,
        434,
        435,
        436,
        437,
        438,
        439,
        440,
        441,
        442,
        443,
        444,
        445,
        446,
        447,
        448,
        449,
        450,
        451,
        452,
        453,
        454,
        455,
        456,
        457,
        458,
        459,
        460,
        461,
        462,
        463,
        464,
        465,
        466,
        467,
        468,
        469,
        470,
        471,
        472,
        473,
        474,
        475,
        476,
        477,
        478,
        479,
        480,
        481,
        482,
        483,
        484,
        485,
        486,
        487,
        488,
        489,
        490,
        491,
        492,
        493,
        494,
        495,
        496,
        497,
        498,
        499,
        500,
        501,
        502,
        503,
        504,
        505,
        506,
        507,
        508,
        509,
        510,
        511,
        512,
        513,
        514,
        515,
        516,
        517,
        518,
        519,
        520,
        521,
        522,
        523,
        524,
        525,
        526,
        527,
        528,
        529,
        530,
        531,
        532,
        533,
        534,
        535,
        536,
        537,
        538,
        539,
        540,
        541,
        542,
        543,
        544,
        545,
        546,
        547,
        548,
        549,
        550,
        551,
        552,
        553,
        554,
        555,
        556,
        557,
        558,
        559,
        560,
        561,
        562,
        563,
        564,
        565,
        566,
        567
      ],
      "tags": [
        "animate",
        "animateMotion",
        "animateTransform",
        "circle",
        "clipPath",
        "defs",
        "desc",
        "ellipse",
        "feBlend",
        "feColorMatrix",
        "feComponentTransfer",
        "feComposite",
        "feConvolveMatrix",
        "feDiffuseLighting",
        "feDisplacementMap",
        "feDistantLight",
        "feDropShadow",
        "feFlood",
        "feFuncA",
        "feFuncB",
        "feFuncG",
        "feFuncR",
        "feGaussianBlur",
        "feImage",
        "feMerge",
        "feMergeNode",
        "feMorphology",
        "feOffset",
        "fePointLight",
        "feSpecularLighting",
        "feSpotLight",
        "feTile",
        "feTurbulence",
        "filter",
        "foreignObject",
        "g",
        "image",
        "line",
        "linearGradient",
        "marker",
        "mask",
        "metadata",
        "mpath",
        "path",
        "pattern",
        "polygon",
        "polyline",
        "radialGradient",
        "rect",
        "stop",
        "svg",
        "switch",
        "symbol",
        "text",
        "textPath",
        "tspan",
        "use",
        "view"
      ]
    },
    {
      "keys": [
        264,
        265,
        266,
        267,
        268,
        269,
        270,
        271,
        272,
        273,
        274,
        275,
        276,
        277,
        278,
        279,
        280,
        281,
        282,
        283,
        284,
        285,
        286,
        287,
        288,
        290,
        291,
        292,
        293,
        294,
        295,
        296,
        297,
        298,
        299,
        300,
        301,
        302,
        303,
        304,
        305,
        306,
        307
      ],
      "tags": [
        "abbr",
        "address",
        "article",
        "aside",
        "b",
        "bdi",
        "bdo",
        "big",
        "body",
        "br",
        "caption",
        "cite",
        "code",
        "datalist",
        "dd",
        "dfn",
        "div",
        "dl",
        "dt",
        "em",
        "figcaption",
        "figure",
        "footer",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "head",
        "header",
        "hgroup",
        "hr",
        "i",
        "kbd",
        "legend",
        "main",
        "mark",
        "menuitem",
        "nav",
        "noindex",
        "noscript",
        "p",
        "picture",
        "pre",
        "rp",
        "rt",
        "ruby",
        "s",
        "samp",
        "section",
        "small",
        "span",
        "strong",
        "sub",
        "summary",
        "sup",
        "tbody",
        "template",
        "tfoot",
        "thead",
        "title",
        "tr",
        "u",
        "ul",
        "var",
        "wbr"
      ]
    },
    {
      "keys": [
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
        21,
        22,
        23,
        24,
        25,
        26,
        27,
        28,
        29,
        30,
        31,
        32,
        33,
        34,
        35,
        36,
        37,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        46,
        47,
        48,
        49,
        50,
        54,
        59,
        80,
        81,
        82,
        83,
        84,
        85,
        86,
        87,
        88,
        89,
        90,
        91,
        92,
        93,
        94,
        95,
        96,
        97,
        99,
        100,
        101,
        102,
        103,
        104,
        105,
        106,
        107,
        108,
        109,
        110,
        111,
        112,
        113,
        114,
        115,
        116,
        117,
        118,
        119,
        120,
        121,
        122,
        123,
        124,
        125,
        126,
        127,
        128,
        129,
        130,
        131,
        132,
        133,
        134,
        135,
        136,
        137,
        138,
        139,
        140,
        141,
        142,
        143,
        144,
        145,
        146,
        147,
        148,
        149,
        150,
        151,
        152,
        153,
        154,
        155,
        156,
        157,
        158,
        159,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        174,
        175,
        176,
        177,
        178,
        179,
        180,
        181,
        182,
        183,
        184,
        185,
        186,
        187,
        188,
        189,
        190,
        191,
        192,
        193,
        194,
        195,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        210,
        211,
        212,
        213,
        214,
        215,
        216,
        217,
        218,
        219,
        220,
        221,
        222,
        223,
        224,
        225,
        226,
        227,
        228,
        229,
        230,
        231,
        232,
        233,
        234,
        235,
        236,
        237,
        238,
        239
      ],
      "tags": [
        "a",
        "abbr",
        "address",
        "animate",
        "animateMotion",
        "animateTransform",
        "area",
        "article",
        "aside",
        "audio",
        "b",
        "base",
        "bdi",
        "bdo",
        "big",
        "blockquote",
        "body",
        "br",
        "button",
        "canvas",
        "caption",
        "circle",
        "cite",
        "clipPath",
        "code",
        "col",
        "colgroup",
        "data",
        "datalist",
        "dd",
        "defs",
        "del",
        "desc",
        "details",
        "dfn",
        "dialog",
        "div",
        "dl",
        "dt",
        "ellipse",
        "em",
        "embed",
        "feBlend",
        "feColorMatrix",
        "feComponentTransfer",
        "feComposite",
        "feConvolveMatrix",
        "feDiffuseLighting",
        "feDisplacementMap",
        "feDistantLight",
        "feDropShadow",
        "feFlood",
        "feFuncA",
        "feFuncB",
        "feFuncG",
        "feFuncR",
        "feGaussianBlur",
        "feImage",
        "feMerge",
        "feMergeNode",
        "feMorphology",
        "feOffset",
        "fePointLight",
        "feSpecularLighting",
        "feSpotLight",
        "feTile",
        "feTurbulence",
        "fieldset",
        "figcaption",
        "figure",
        "filter",
        "footer",
        "foreignObject",
        "form",
        "g",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "head",
        "header",
        "hgroup",
        "hr",
        "html",
        "i",
        "iframe",
        "image",
        "img",
        "input",
        "ins",
        "kbd",
        "keygen",
        "label",
        "legend",
        "li",
        "line",
        "linearGradient",
        "link",
        "main",
        "map",
        "mark",
        "marker",
        "mask",
        "menu",
        "menuitem",
        "meta",
        "metadata",
        "meter",
        "mpath",
        "nav",
        "noindex",
        "noscript",
        "object",
        "ol",
        "optgroup",
        "option",
        "output",
        "p",
        "param",
        "path",
        "pattern",
        "picture",
        "polygon",
        "polyline",
        "pre",
        "progress",
        "q",
        "radialGradient",
        "rect",
        "rp",
        "rt",
        "ruby",
        "s",
        "samp",
        "script",
        "section",
        "select",
        "small",
        "source",
        "span",
        "stop",
        "strong",
        "style",
        "sub",
        "summary",
        "sup",
        "svg",
        "switch",
        "symbol",
        "table",
        "tbody",
        "td",
        "template",
        "text",
        "textPath",
        "textarea",
        "tfoot",
        "th",
        "thead",
        "time",
        "title",
        "tr",
        "track",
        "tspan",
        "u",
        "ul",
        "use",
        "var",
        "video",
        "view",
        "wbr",
        "webview"
      ]
    }
  ]
}`;
