import { NonBaseVariantTransitionsMessage } from "@/wab/client/components/sidebar-tabs/style-tab";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { SidebarSectionHandle } from "@/wab/client/components/sidebar/SidebarSection";
import {
  StyleComponent,
  StyleComponentProps,
  StylePanelSection,
  TplExpsProvider,
} from "@/wab/client/components/style-controls/StyleComponent";
import { StyleWrapper } from "@/wab/client/components/style-controls/StyleWrapper";
import { TransitionPanel } from "@/wab/client/components/style-controls/transition-panel";
import {
  IconLinkButton,
  ListBox,
  ListBoxItem,
} from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { arrayMoveIndex } from "@/wab/collections";
import { assert, ensure, maybe, tuple, uniqueKey } from "@/wab/common";
import { removeFromArray } from "@/wab/commons/collections";
import { getCssInitial } from "@/wab/css";
import { transitionProps } from "@/wab/shared/core/style-props";
import { joinCssValues, RSH, splitCssValue } from "@/wab/shared/RuleSetHelpers";
import { isBaseVariant, tryGetBaseVariantSetting } from "@/wab/shared/Variants";
import { observer } from "mobx-react";
import React, { createRef } from "react";

export class Transition {
  transitionProperty: string;
  transitionTimingFunction: string;
  transitionDuration: string;
  transitionDelay: string;
}

interface TransitionsPanelSectionState {
  // index of the inspected transition
  index?: number;
}

class _TransitionsPanelSection extends StyleComponent<
  StyleComponentProps,
  TransitionsPanelSectionState
> {
  private readonly sectionRef: React.RefObject<SidebarSectionHandle>;

  constructor(props: StyleComponentProps) {
    super(props);
    this.state = {};
    this.sectionRef = createRef<SidebarSectionHandle>();
  }

  get baseExp() {
    if (this.props.expsProvider instanceof TplExpsProvider) {
      const tpl = this.props.expsProvider.tpl;
      return RSH(
        ensure(
          tryGetBaseVariantSetting(tpl),
          "Unexpected undefined base variant for tpl"
        ).rs,
        tpl
      );
    } else {
      return this.props.expsProvider.mergedExp();
    }
  }

  updateTransitions = (transitions: Transition[]) => {
    return this.change(() => {
      const updateRule = (key: string, values: string[]) => {
        // "transition-property" should be always set when transitions are used,
        // so we avoid deleting them. Other properties might be omitted if they
        // use the default value only.
        if (
          values.some((value) => value !== getCssInitial(key, undefined)) ||
          (values.length > 0 && key === "transition-property")
        ) {
          this.baseExp.set(key, joinCssValues(key, values));
        } else {
          this.baseExp.clear(key);
        }
      };
      updateRule(
        "transition-property",
        transitions.map((v) => v.transitionProperty)
      );
      updateRule(
        "transition-timing-function",
        transitions.map((v) => v.transitionTimingFunction)
      );
      updateRule(
        "transition-duration",
        transitions.map((v) => v.transitionDuration)
      );
      updateRule(
        "transition-delay",
        transitions.map((v) => v.transitionDelay)
      );
    });
  };

  inspectTransition = (index: number) => {
    this.setState({ index });
  };

  render() {
    const viewCtx = this.studioCtx().focusedViewCtx();

    const isTargetingNonBaseVariant =
      this.props.expsProvider instanceof TplExpsProvider &&
      viewCtx &&
      !isBaseVariant(viewCtx.variantTplMgr().getCurrentVariantCombo());

    const transitions = ((): Transition[] => {
      const exp = this.baseExp;
      const parsedRules = Object.fromEntries(
        transitionProps.map((prop) =>
          tuple(
            prop,
            maybe(exp.getRaw(prop), (val) => splitCssValue(prop, val)) ?? []
          )
        )
      );
      const parsedRulesArray = Object.values(parsedRules);
      const numLayers = ensure(
        Math.max(...parsedRulesArray.map((rule) => rule?.length ?? 0)),
        "Unexpected undefined number of layers"
      );
      assert(
        parsedRulesArray.every(
          (rule) => rule?.length === numLayers || rule?.length === 0
        ),
        "Every parsed rule should have the same length or be empty"
      );
      const getRule = (prop: string, index: number) =>
        parsedRules[prop]?.[index] || getCssInitial(prop, undefined);

      return Array.from({ length: numLayers }).map((_, index) => ({
        transitionProperty: getRule("transition-property", index),
        transitionTimingFunction: getRule("transition-timing-function", index),
        transitionDuration: getRule("transition-duration", index),
        transitionDelay: getRule("transition-delay", index),
      }));
    })();

    const addTransition = () => {
      const newTransition: Transition = {
        transitionProperty: "all",
        transitionTimingFunction: "ease",
        transitionDuration: "1s",
        transitionDelay: "0s",
      };
      transitions.push(newTransition);
      this.updateTransitions(transitions);
      this.inspectTransition(transitions.length - 1);

      this.sectionRef.current?.expand();
    };

    const { index } = this.state;

    return (
      <StylePanelSection
        key={String(transitions.length > 0)}
        ref={this.sectionRef}
        expsProvider={this.props.expsProvider}
        title="Transitions"
        styleProps={transitionProps}
        onHeaderClick={transitions.length === 0 ? addTransition : undefined}
        controls={
          <IconLinkButton onClick={addTransition}>
            <Icon icon={PlusIcon} />
          </IconLinkButton>
        }
        defaultHeaderAction={addTransition}
      >
        {transitions.length > 0 && (
          <>
            {isTargetingNonBaseVariant && (
              <div className="canvas-editor__right-float-pane">
                <NonBaseVariantTransitionsMessage />
              </div>
            )}
            {index !== undefined && (
              <SidebarModal
                show
                title="Transition"
                onClose={() =>
                  this.setState({
                    index: undefined,
                  })
                }
              >
                {
                  <div className="panel-content">
                    <TransitionPanel
                      transition={transitions[index]}
                      onChange={(newValue: Transition) => {
                        transitions[index] = newValue;
                        this.updateTransitions(transitions);
                      }}
                    />
                  </div>
                }
              </SidebarModal>
            )}
            <StyleWrapper
              styleName={transitionProps}
              displayStyleName="transition"
              className="flex-fill"
              showDefinedIndicator={true}
            >
              <ListBox
                appendPrepend={"append"}
                onReorder={(from, to) => {
                  const moved = arrayMoveIndex(transitions, from, to);
                  this.updateTransitions(moved);
                }}
              >
                {transitions.map((transition: Transition, i: number) => {
                  return (
                    <ListBoxItem
                      key={uniqueKey(transition)}
                      index={i}
                      onRemove={() => {
                        removeFromArray(transitions, transition);
                        return this.updateTransitions(transitions);
                      }}
                      onClick={() => this.inspectTransition(i)}
                      mainContent={
                        <div className="labeled-item labeled-item--horizontal--vcenter">
                          <div className="labeled-item__label labeled-item__label--horizontal">
                            Property
                          </div>
                          <code>{transition.transitionProperty}</code>
                        </div>
                      }
                    />
                  );
                })}
              </ListBox>
            </StyleWrapper>
          </>
        )}
      </StylePanelSection>
    );
  }
}
export const TransitionsPanelSection = observer(_TransitionsPanelSection);
