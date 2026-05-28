import { useEffect, useRef, type ComponentPropsWithoutRef, type MouseEvent } from "react";

type ModalDialogProps = Omit<ComponentPropsWithoutRef<"dialog">, "open" | "onClose"> & {
  open: boolean;
  onClose: () => void;
  closeOnBackdrop?: boolean;
};

const ModalDialog = ({
  open,
  onClose,
  closeOnBackdrop = true,
  children,
  ...props
}: ModalDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      try {
        dialog.showModal();
      } catch {}
    } else if (!open && dialog.open) {
      try {
        dialog.close();
      } catch {}
    }
  }, [open]);

  const onBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (closeOnBackdrop && event.target === dialogRef.current) onClose();
  };

  return (
    // <dialog> gère nativement ESC ; ce clic ne sert qu'au backdrop.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <dialog
      ref={dialogRef}
      aria-modal="true"
      onClose={onClose}
      onClick={onBackdropClick}
      {...props}
    >
      {children}
    </dialog>
  );
};

export default ModalDialog;
