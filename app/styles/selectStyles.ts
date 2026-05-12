export const selectStyles = {
  control: (base) => ({
    ...base,
    backgroundColor: "#09090b",
    borderColor: "#3f3f46",
    borderRadius: "0.75rem",
    minHeight: "42px",
    boxShadow: "none",
  }),

  input: (base) => ({
    ...base,
    color: "white",
  }),

  singleValue: (base) => ({
    ...base,
    color: "white",
  }),

  menu: (base) => ({
    ...base,
    backgroundColor: "#09090b",
    border: "1px solid #3f3f46",
  }),

  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#27272a" : "#09090b",
    color: "white",
  }),
};