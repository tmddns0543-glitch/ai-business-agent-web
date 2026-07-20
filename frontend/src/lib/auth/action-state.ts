export type AuthActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export const INITIAL_AUTH_STATE: AuthActionState = {
  status: "idle",
  message: "",
};
