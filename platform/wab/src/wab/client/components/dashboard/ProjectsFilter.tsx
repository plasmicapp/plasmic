import {
  DefaultProjectsFilterProps,
  PlasmicProjectsFilter,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicProjectsFilter";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

export interface ProjectsFilterProps extends DefaultProjectsFilterProps {
  query: string;
  setQuery: (query: string) => void;
  orderBy: string;
  setOrderBy: (orderBy: string | null) => void;
}

function ProjectsFilter_(
  props: ProjectsFilterProps,
  ref: HTMLElementRefOf<"div">
) {
  const { query, setQuery, orderBy, setOrderBy, ...rest } = props;
  return (
    <PlasmicProjectsFilter
      root={{ ref }}
      {...rest}
      orderBySelect={{
        "aria-label": "Order by",
        value: orderBy,
        onChange: setOrderBy,
      }}
      searchBox={{
        value: query,
        onChange: (e) => setQuery(e.target.value),
        autoFocus: true,
      }}
    />
  );
}

const ProjectsFilter = React.forwardRef(ProjectsFilter_);
export default ProjectsFilter;
