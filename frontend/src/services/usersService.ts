import { mockUsers } from "../mock";
import type { User } from "../types";

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export const usersService = {
  async list(): Promise<User[]> {
    await delay(300);
    return [...mockUsers];
  },
  async getCurrent(): Promise<User> {
    await delay(200);
    return mockUsers[0];
  },
};
