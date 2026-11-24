import { createContext, useContext } from 'react';

type FormScrollValue = { revealFocused: () => void };

export const FormScrollContext = createContext<FormScrollValue | null>(null);

export const useFormScroll = () => useContext(FormScrollContext);
