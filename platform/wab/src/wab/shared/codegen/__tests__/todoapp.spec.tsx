import "@testing-library/jest-dom/extend-expect";
import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// polyfill some js features like String.matchAll()
import { Bundle, Bundler } from "@/wab/shared/bundler";
import { codegen } from "@/wab/shared/codegen/codegen-tests-util";
import { Site } from "@/wab/shared/model/classes";
import "core-js";
import * as React from "react";
import tmp from "tmp";
// Exported from https://studio.plasmic.app/projects/a76RKRQpJHMAbDDNBWmUVs
import _bundle from "@/wab/shared/codegen/__tests__/bundles/todoapp.json";

describe("todo app codegen", () => {
  const projectBundle = _bundle[0][1] as Bundle;
  const site = new Bundler().unbundle(projectBundle, "") as Site;

  const dir = tmp.dirSync({ unsafeCleanup: true });
  afterEach(() => {
    dir.removeCallback();
  });
  it("should work", async () => {
    const importFromProject = await codegen(dir.name, site);

    const Homepage = (await importFromProject("Homepage.js")).default;

    // Render the component using @testing-library
    render(React.createElement(Homepage));

    const tasksList = [
      { title: "Task 1", done: false, id: 0 },
      { title: "Task 2", done: true, id: 1 },
      { title: "Task 3", done: false, id: 2 },
      { title: "Task 4", done: false, id: 3 },
    ];
    let nextId = tasksList.length;

    const rootElement = document.querySelector(
      `[data-testid="root"]`
    ) as HTMLElement;
    const root = within(rootElement);

    const checkTasks = () => {
      expect(root.getByTestId(`tasks-container`).children.length).toBe(
        tasksList.length
      );
      for (const task of tasksList) {
        expect(root.getByTestId(`text-${task.id}`)).toHaveTextContent(
          task.title
        );
        if (task.done) {
          expect(root.getByTestId(`text-${task.id}`)).toHaveStyle({
            "text-decoration": "line-through",
          });
        } else {
          expect(root.getByTestId(`text-${task.id}`)).toHaveStyle({
            "text-decoration": "none",
          });
        }
      }
    };

    const addTask = async () => {
      await userEvent.click(root.getByTestId("add-task"));
      tasksList.push({ title: "New task", done: false, id: nextId });
      return nextId++;
    };

    const toggleDone = async (id: number) => {
      await userEvent.click(root.getByTestId(`switch-${id}`));
      const task = tasksList.find((itask) => itask.id === id);
      if (task) {
        task.done = !task.done;
      }
    };

    const removeTask = async (id: number) => {
      await userEvent.click(root.getByTestId(`remove-${id}`));
      const taskIndex = tasksList.findIndex((task) => task.id === id);
      if (taskIndex !== -1) {
        tasksList.splice(taskIndex, 1);
      }
    };

    const editTask = async (id: number, newText: string) => {
      await userEvent.dblClick(root.getByTestId(`text-${id}`));
      await userEvent.type(
        root.getByTestId(`textInput-${id}`),
        `${newText}{enter}`
      );
      const task = tasksList.find((itask) => itask.id === id);
      if (task) {
        task.title += newText;
      }
    };

    checkTasks();

    await addTask();
    await addTask();
    checkTasks();

    await editTask(0, "My first title");
    await editTask(2, "My second title");
    checkTasks();

    await toggleDone(0);
    await toggleDone(1);
    checkTasks();

    await removeTask(2);
    await removeTask(0);
    checkTasks();

    // can't edit finished tasks
    const newId = await addTask();
    await toggleDone(newId);
    await userEvent.dblClick(root.getByTestId(`text-${newId}`));
    expect(root.queryByTestId(`textInput-${newId}`)).not.toBeInTheDocument();
  }, 300000);
});
