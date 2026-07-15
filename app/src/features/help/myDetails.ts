// Split from MyDetailsPanel.tsx (react/only-export-components) — that file
// should export only the component itself so Fast Refresh keeps working;
// the type/constant HelpMenu.tsx and InstructionsContent.tsx also need live
// here instead.
export interface MyDetails {
  email: string
  password: string
}

export const EMPTY_MY_DETAILS: MyDetails = { email: '', password: '' }
