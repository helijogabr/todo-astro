import * as authActions from "./auth";
import * as todoActions from "./todos";

export const server = {
  ...todoActions,
  ...authActions,
};
