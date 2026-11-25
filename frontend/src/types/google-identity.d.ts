type GoogleCredentialResponse = { credential: string; select_by?: string };

type GoogleIdConfiguration = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  ux_mode?: "popup" | "redirect";
  context?: "signin" | "signup" | "use";
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  itp_support?: boolean;
};

type GoogleButtonConfiguration = {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
  locale?: string;
};

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: GoogleIdConfiguration) => void;
        renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void;
        cancel: () => void;
      };
    };
  };
}
