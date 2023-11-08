import { sortBy } from "lodash";
import * as React from "react";
import { useLocalStorage } from "react-use";
import { ApiCmsDatabase, ApiProject } from "../../shared/ApiSchema";
import { ProjectsFilterProps } from "../components/dashboard/ProjectsFilter";
import { Matcher } from "../components/view-common";

const orderByStorageKey = "projectsFilter-orderBy";
const defaultOrderBy = "updatedAt";

interface UseProjectsFilter {
  projects: ApiProject[];
  databases: ApiCmsDatabase[];
  props: ProjectsFilterProps;
  matcher: Matcher;
}

export function useProjectsFilter(
  unsortedProjects: ApiProject[] | undefined,
  unsortedDatabases: ApiCmsDatabase[] | undefined,
  matchWorkspace = true
): UseProjectsFilter {
  const [orderBy, setOrderBy] = useLocalStorage<string | null>(
    orderByStorageKey,
    defaultOrderBy
  );
  const [query, setQuery] = React.useState("");

  const matcher = new Matcher(query);
  const filteredProjects = unsortedProjects?.filter(
    (p) =>
      matcher.matches(p.name) ||
      (matchWorkspace && matcher.matches(p.workspaceName || ""))
  );
  const filteredDatabases = unsortedDatabases?.filter((d) =>
    matcher.matches(d.name)
  );

  const projects =
    orderBy === "updatedAt"
      ? sortBy(filteredProjects, (p) => p.updatedAt).reverse()
      : sortBy(filteredProjects, (p) => p.name);

  const databases =
    orderBy === "updatedAt"
      ? sortBy(filteredDatabases, (p) => p.updatedAt).reverse()
      : sortBy(filteredDatabases, (p) => p.name);

  return {
    projects,
    databases,
    matcher,
    props: {
      query,
      setQuery,
      orderBy: orderBy || defaultOrderBy,
      setOrderBy,
    },
  };
}
