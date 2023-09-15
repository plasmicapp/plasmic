import { TableFieldType } from "@plasmicapp/data-sources";

export const fakeSchema: Record<
  string,
  { id: string; name: string; type: TableFieldType; primaryKey?: boolean }[]
> = {
  athletes: [
    { id: "id", name: "id", type: "number", primaryKey: true },
    { id: "firstName", name: "firstName", type: "string" },
    { id: "lastName", name: "lastName", type: "string" },
    { id: "sport", name: "sport", type: "string" },
    { id: "age", name: "age", type: "number" },
  ],
  products: [
    { id: "id", name: "id", type: "number", primaryKey: true },
    { id: "name", name: "name", type: "string" },
    { id: "price", name: "price", type: "number" },
  ],
};

export const fakeInitDatabase: any = {
  athletes: [
    {
      id: 1,
      firstName: "Roger",
      lastName: "Federer",
      sport: "Tennis",
      age: 38,
    },
    {
      id: 2,
      firstName: "Neymar",
      lastName: "Silva",
      sport: "Futebol",
      age: 31,
    },
    {
      id: 3,
      firstName: "Serena",
      lastName: "Williams",
      sport: "Tennis",
      age: 35,
    },
    {
      id: 4,
      firstName: "Stephen",
      lastName: "Curry",
      sport: "Basketball",
      age: 32,
    },
  ],
  products: [
    {
      id: 1,
      name: "Milk",
      price: 2,
    },
    {
      id: 2,
      name: "Eggs",
      price: 0.5,
    },
    {
      id: 3,
      name: "Chicken",
      price: 7,
    },
  ],
};
