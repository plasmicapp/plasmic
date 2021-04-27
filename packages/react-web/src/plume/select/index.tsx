/**
 * Select is implemented with react-aria's useSelect hook. However, we are _not_ exposing the
 * "Collections" API underpinning react-aria's select, because it is overly abstract
 * in the context of Plasmic.  For example, here's how you would use react-spectrum's Picker:
 *
 *   <Picker>
 *     <Section title="Asia">
 *       <Item key="taiwan">Taiwan</Item>
 *       <Item key="japan">Japan</Item>
 *       <Item key="china">China</Item>
 *     </Section>
 *     <Section title="Europe">
 *       <Item key="germany">Germany</Item>
 *       <Item key="france">France</Item>
 *     </Section>
 *   </Picker>
 *
 * Here, `Section` and `Item` are data-passing components that don't render anything, and
 * only serve to collect information for the Picker.
 *
 * In Plasmic, though, the user has explicitly designed components like Select.Option and
 * Select.OptionGroup, and it is weird that they don't actually use these components.
 * It is more natural to do:
 *
 *   <Select>
 *     <Select.OptionGroup title="Asia">
 *       <Select.Option key="taiwan">Taiwan</Select>
 *     </Select.OptionGroup>
 *   </Select>
 *
 * For Plume, we let users directly use the components they designed, both to collect
 * information and to perform actual rendering.
 */

export {
  BaseSelectProps,
  SelectBehaviorConfig,
  SelectRef,
  useSelect,
} from "./select";
export {
  BaseSelectOptionProps,
  SelectOptionRef,
  useSelectOption,
} from "./select-option";
export {
  BaseSelectOptionGroupProps,
  useSelectOptionGroup,
} from "./select-option-group";
