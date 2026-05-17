import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import LegalPolicyModal from "../components/LegalPolicyModal";

const LegalPolicyModalContext = createContext(null);

export function LegalPolicyModalProvider({ children }) {
  const [doc, setDoc] = useState(null);
  const [visible, setVisible] = useState(false);

  const openTerms = useCallback(() => {
    setDoc("terms");
    setVisible(true);
  }, []);

  const openPrivacy = useCallback(() => {
    setDoc("privacy");
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    if (visible || !doc) return undefined;
    const t = window.setTimeout(() => setDoc(null), 280);
    return () => window.clearTimeout(t);
  }, [visible, doc]);

  useEffect(() => {
    if (!visible) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  const value = useMemo(
    () => ({ openTerms, openPrivacy, close }),
    [openTerms, openPrivacy, close],
  );

  return (
    <LegalPolicyModalContext.Provider value={value}>
      {children}
      {doc != null ? <LegalPolicyModal doc={doc} visible={visible} onClose={close} /> : null}
    </LegalPolicyModalContext.Provider>
  );
}

export function useLegalPolicyModal() {
  const ctx = useContext(LegalPolicyModalContext);
  if (!ctx) {
    throw new Error("useLegalPolicyModal must be used within LegalPolicyModalProvider");
  }
  return ctx;
}
