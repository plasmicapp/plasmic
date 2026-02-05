import { StandardMarkdown } from "@/wab/client/utils/StandardMarkdown";
import {
  INTERACTION_VARIANTS_LOWER,
  MIXINS_CAP,
  MIXIN_LOWER,
  PRIVATE_STYLE_VARIANTS_CAP,
} from "@/wab/shared/Labels";
import React, { ReactNode } from "react";

export function MixinsTooltip({ preamble }: { preamble?: ReactNode }) {
  return (
    <div>
      <p className={"tooltip-title"}>{MIXINS_CAP}</p>
      {preamble}
      <p>
        {MIXINS_CAP} are entire bundles of styles that you can apply to many
        elements. Normally, you set styles directly on elements, via the Design
        tab in the right sidebar. You can instead store some or all those styles
        in a style preset, and then apply the style preset to elements.
      </p>
      <p>
        You can right-click styles or style sections to extract them into a{" "}
        {MIXIN_LOWER}.
      </p>
      <p>
        Style presets are a powerful way to let you design faster and maintain
        consistency.
      </p>
      <p>
        <a
          target="_blank"
          href={"https://docs.plasmic.app/learn/style-presets"}
        >
          Learn more in the docs
        </a>
        .
      </p>
    </div>
  );
}

export function VariantsTooltip({ preamble }: { preamble?: ReactNode }) {
  return (
    <div>
      <p className={"tooltip-title"}>Variants</p>
      {preamble}
      <p>
        <strong>Variants</strong> let you design a page or component to look
        different in different conditions. For instance, a page can have a
        mobile variant or a French variant. A Button component can have
        hover/pressed states, or primary/secondary styles.
      </p>
      <p>
        Use the on-canvas variant toolbar to toggle recording to any variant.
        Any edits you make while recording will <strong>override</strong> the
        component's "Base" (default) appearance. These overrides are indicated
        by a red colored dot.
      </p>
      <p>
        <em>Screen variants</em> are a special variant group that are based on
        screen size ("breakpoints") such as desktop vs. mobile.
      </p>
      <p>
        <a target="_blank" href={"https://docs.plasmic.app/learn/variants"}>
          Learn more in the docs
        </a>
        .
      </p>
    </div>
  );
}

export function GlobalVariantsTooltip() {
  return (
    <div>
      <p className={"tooltip-title"}>Global Variants</p>
      <p>
        If you want to re-theme the entire app, such as adding a dark mode, or a
        French language translation, you probably want to change many
        pages/components together.
      </p>
      <p>
        <strong>Global variants</strong> are similar to normal
        (component/page-specific) variants, except that global variants are
        global to the entire project: <em>any</em> component can have edits
        defined under a single “Dark mode” variant.
      </p>
      <p>
        <a
          target={"_blank"}
          href={"https://docs.plasmic.app/learn/global-variants/"}
        >
          Learn more in the docs
        </a>
        .
      </p>
    </div>
  );
}

export function VariantCombosTooltip() {
  return (
    <div>
      <p className={"tooltip-title"}>Variant Combinations</p>
      <p>
        This lists all the combinations of variants that this component has
        recorded edits for. For instance, you might want a Button to have
        specific style settings when both the "Primary" variant and "Hover"
        interaction variant are activated.
      </p>
      <p>
        <a
          target={"_blank"}
          href={
            "https://docs.plasmic.app/learn/variants/#targeting-combinations-of-variants"
          }
        >
          Learn more in the docs
        </a>
        .
      </p>
    </div>
  );
}

export function MetadataTooltip() {
  return (
    <div>
      <p className={"tooltip-title"}>Component metadata</p>
      <p>
        You can specify arbitrary key-value pairs as metadata for this page or
        component. Note: these are not page "meta tags"--these are arbitrary
        data for your code to consume from the headless API or in codegen (for
        any purpose). Learn more in the API docs.
      </p>
      <p>
        <a
          target={"_blank"}
          href={"https://docs.plasmic.app/learn/page-head-metadata/"}
        >
          Learn more in the docs
        </a>
        .
      </p>
    </div>
  );
}

export function PropsTooltip() {
  return (
    <div>
      <p className={"tooltip-title"}>Prop</p>
      <p>
        When you add a prop to a component, then on any instance of the
        component, you can pass in a different value for that prop. And you can
        use that prop value within the component.
      </p>
      <p>
        For instance, if on a Product Card component you add a prop for Product
        ID, then each instance can specify a different Product ID. And
        internally, the Product Card could use that Product ID in a query to
        some data source.
      </p>
      <p>
        <a target={"_blank"} href={"https://docs.plasmic.app/learn/props"}>
          Learn more in the docs
        </a>
        .
      </p>
    </div>
  );
}

export function ElementVariantsTooltip() {
  return (
    <div>
      <p className={"tooltip-title"}>{PRIVATE_STYLE_VARIANTS_CAP}</p>

      <p>
        {PRIVATE_STYLE_VARIANTS_CAP} let you edit the styles of individual
        elements in special interactive states, such as hovered, focused,
        pressed.
      </p>

      <p>
        {PRIVATE_STYLE_VARIANTS_CAP} can also target elements in a more advanced
        way using{" "}
        <a
          href="https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes"
          target="_blank"
        >
          CSS pseudo-classes
        </a>
        .
      </p>

      <p>
        (Component <em>{INTERACTION_VARIANTS_LOWER}</em> are similar, but let
        you edit anything in the component based on the hover/focused/pressed
        state of the component's root element.)
      </p>
    </div>
  );
}

export function ProjectDependenciesTooltip() {
  return (
    <div>
      <p className={"tooltip-title"}>Project Dependencies</p>
      <p>
        You can import other Plasmic projects as a dependency. The imported
        components are labeled as <em>imported components</em>, in the
        Components tab. Imported components are read-only. In order to edit
        these components, please visit their home project.
      </p>
    </div>
  );
}

export function AttributesTooltip() {
  return (
    <div>
      <p className={"tooltip-title"}>Attributes</p>
      <p>
        Attributes are non-style settings you can set on an element. Examples
        include hover text, ARIA attributes, and tab order.
      </p>
      <p>
        Different types of elements have different attributes. For instance,
        with text inputs you can set placeholder text, with links you can set
        the URL, with buttons you can set whether it's disabled, and so on.
      </p>
    </div>
  );
}

export function SlotsTooltip() {
  return (
    <div>
      <p className={"tooltip-title"}>Slots</p>
      <p>
        Slots let you fill in different instances of a component with different
        content.
      </p>
      <p>
        Converting an element in a component to a slot target means you want to
        let component instances override that element.
      </p>
      <p>
        <a target={"_blank"} href={"https://docs.plasmic.app/learn/slots"}>
          Learn more in the docs
        </a>
        .
      </p>
    </div>
  );
}

export function ApplyMixinsTooltip() {
  return (
    <MixinsTooltip
      preamble={
        <>
          <p>
            This is where you can apply style presets to the selected element.
          </p>
          <p>
            <a
              target={"_blank"}
              href={"https://docs.plasmic.app/learn/style-presets"}
            >
              Learn more in the docs
            </a>
            .
          </p>
        </>
      }
    />
  );
}

export function ApplyCustomBehaviorsTooltip() {
  return (
    <CustomBehaviorsTooltip
      preamble={
        <>
          <p>
            This is where you can apply Custom Behaviors to the selected
            element. Use cases are general and varied. Examples: attach
            click-tracking to an element, or trigger a complex interaction, or
            apply an animated effect transform.
          </p>
          <p>
            Underlying these are code components that are meant to wrap around
            an element.
          </p>
          <p>
            <a
              target="_blank"
              href="https://docs.plasmic.app/learn/custom-behaviors"
            >
              Learn more in the docs
            </a>
            .
          </p>
        </>
      }
    />
  );
}

export function RepeaterPropsTooltip() {
  return (
    <div>
      <p className={"tooltip-title"}>Repeater Props</p>
      <p>
        This section shows props for the parent Repeater component. You can use
        it to customize the elements which are being repeated.
      </p>
    </div>
  );
}

export function PageParamsTooltip() {
  return (
    <div>
      <p className={"tooltip-title"}>Preview parameters</p>
      <p>{`
        This section shows URL parameters defined in page path using brackets
        (e.g. [param]). In production, such parameters are defined based in
        the URL, but in studio you can customize what preview value they
        should have. For example, if your page path is /products/[slug] you
        can see how the page looks like and customize its styles using
        different "slug" values.
      `}</p>
    </div>
  );
}

export function PageQueryParamsTooltip() {
  return (
    <div style={{ paddingBottom: 10 }}>
      <p className={"tooltip-title"}>URL Parameters</p>
      <p>
        Add a <em>path parameter</em> like{" "}
        <span style={{ opacity: 0.5 }}>/item/</span>
        <strong>[id]</strong> to accept URLs like{" "}
        <span style={{ opacity: 0.5 }}>abc.com/item/</span>
        <strong>235</strong>.
      </p>
      <p>
        Add a <em>URL query parameter</em> to accept URLs like{" "}
        <span style={{ opacity: 0.5 }}>abc.com/item/235</span>?
        <strong>coupon=summer10</strong>.
      </p>
      <p>
        Here you can also set the current preview values for these parameters.
      </p>
      <p>
        <a
          target={"_blank"}
          href="https://docs.plasmic.app/learn/dynamic-pages"
        >
          Learn more in the docs
        </a>
        .
      </p>
    </div>
  );
}

export function ServerQueriesTooltip() {
  return (
    <div style={{ paddingBottom: 10 }}>
      <p>
        Add <strong>data queries</strong> to get data from a data source such as
        an API or CMS.
      </p>
      <p>
        <a target={"_blank"} href="https://docs.plasmic.app/learn/integrations">
          Learn more in the docs
        </a>
        .
      </p>
    </div>
  );
}

export function DataQueriesDeprecatedTooltip() {
  return (
    <div style={{ paddingBottom: 10 }}>
      <p>
        Old data queries are deprecated. Please use the new data queries in the
        section above.
      </p>
      <p>
        <a target={"_blank"} href="https://docs.plasmic.app/learn/integrations">
          Learn more about this change in the docs
        </a>
        .
      </p>
    </div>
  );
}

export function DataQueriesTooltip() {
  return (
    <div style={{ paddingBottom: 10 }}>
      <p>
        Add <strong>data queries</strong> to get data from an{" "}
        <em>integration</em> like a backend database or API.
      </p>
      <p>
        <a target={"_blank"} href="https://docs.plasmic.app/learn/integrations">
          Learn more in the docs
        </a>
        .
      </p>
    </div>
  );
}

export function StateVariablesTooltip() {
  return (
    <div style={{ paddingBottom: 10 }}>
      <p>
        Create <strong>state variables</strong> to store any data that can
        change in your UI over time or as the user interacts. Update these from
        interactions, and connect your UI to them with dynamic values.
      </p>
      <p>
        For instance, add a <code>counter</code> number variable that increments
        every time the user clicks a button. Set an element's text dynamic value
        to display the current <code>counter</code>.
      </p>
      <p>
        <a
          target={"_blank"}
          href="https://docs.plasmic.app/learn/interactions/"
        >
          Learn more in the docs
        </a>
        .
      </p>
    </div>
  );
}

export function InstanceVariantsTooltip() {
  return (
    <VariantsTooltip
      preamble={
        <p>
          This is where you can select what variant(s) to show on the selected
          component instance.
        </p>
      }
    />
  );
}

export function ModeTooltip() {
  return (
    <div>
      <p className={"tooltip-title"}>Mode</p>
      <p>
        You can choose to use either the <strong>Loader</strong> or{" "}
        <strong>Codegen</strong> paths. The Loader path is only available for
        Next.js and Gatsby-based builds, and can greatly simplify deployments
        for most use cases. For all other React stacks, for users who want
        advanced customizability, and to be able to check Plasmic-generated code
        into your repository, choose the Codegen path.
      </p>
      <p>(Loader is not available for existing repositories)</p>
    </div>
  );
}

export function DefaultActionTooltip() {
  return (
    <div>
      <p className={"tooltip-title"}>Default action</p>
      <p>
        When you push a Plasmic project to a GitHub repository, you can choose
        whether to make a pull request with the updated code generated by
        Plasmic or directly commit that code. This option sets the default
        behavior, but it can be overriden per push.
      </p>
    </div>
  );
}

export function CustomBehaviorsTooltip({ preamble }: { preamble?: ReactNode }) {
  return (
    <div>
      <p className={"tooltip-title"}>Custom behaviors</p>
      {preamble}
    </div>
  );
}

export function LeftImagesSectionTooltip({
  preamble,
}: {
  preamble?: ReactNode;
}) {
  return (
    <div>
      <p className={"tooltip-title"}>Images</p>
      {preamble}
      <p>
        Images are any PNGs, JPGs, or non-colorable SVGs that you can use
        throughout your designs as pictures or background images.
      </p>
    </div>
  );
}

export function LeftIconsSectionTooltip({
  preamble,
}: {
  preamble?: ReactNode;
}) {
  return (
    <div>
      <p className={"tooltip-title"}>Icons</p>
      {preamble}
      <p>
        Icons are colorable (but monochrome) SVGs that you can use throughout
        your designs.
      </p>
    </div>
  );
}

export function AuthProviderTooltip() {
  return (
    <div>
      <StandardMarkdown>
        {`
Plasmic Auth lets users sign up and sign in using Plasmic's integrated auth system.
This is the simplest option.

You can also use a third-party auth provider by switching to Custom Auth (requires code integration).
Examples: Auth0, Supabase Auth, Xano.

[Learn more in the docs](https://docs.plasmic.app/learn/auth).
`}
      </StandardMarkdown>
    </div>
  );
}

export function UserDirectoryTooltip() {
  return (
    <div>
      <p>
        User directories are lists of users and user groups. These are reused
        across projects in your organization or workspace.
      </p>
      <p>
        <a target={"_blank"} href={"https://docs.plasmic.app/learn/auth"}>
          Learn more in the docs
        </a>
        .
      </p>
    </div>
  );
}

export function RolesTooltip() {
  return (
    <StandardMarkdown>
      {`
Here you define the roles that you can assign users/groups to (in the Permissions tab).

Then, throughout your application, you can set the required role on queries, pages, and components. For instance, only admins should be able to update all records, or only logged-in users can access a page.

Roles are ordered--higher roles can do anything lower roles can do.

[Learn more in the docs](https://docs.plasmic.app/learn/auth).
`}
    </StandardMarkdown>
  );
}

export function DefaultRoleTooltip() {
  return (
    <StandardMarkdown>
      {`
Set the default minimum required role for all new pages.

**Changing this does not affecting existing pages**.

[Learn more in the docs](https://docs.plasmic.app/learn/auth).
`}
    </StandardMarkdown>
  );
}

export function AuthRedirectsTooltip() {
  return (
    <StandardMarkdown>
      {`
This lists allowed URLs to redirect the user to after successful login with Plasmic Auth.

Only needed if you are not using Plasmic Hosting and are using codebase integration. This affects what you can pass to the \`authRedirectUri\` prop in \`PlasmicRootProvider\`.

[Learn more in the docs](https://docs.plasmic.app/learn/auth-integration).
            `}
    </StandardMarkdown>
  );
}

export function AuthTokenTooltip() {
  return (
    <StandardMarkdown>
      {`
If using Custom Auth, this is the secret token to integrate with your codebase.

Pass this into \`ensurePlasmicAppUser()\` to get a user token, and thus be able to run integration queries/operations as that user.

[Learn more in the docs](https://docs.plasmic.app/learn/auth-integration).
`}
    </StandardMarkdown>
  );
}
