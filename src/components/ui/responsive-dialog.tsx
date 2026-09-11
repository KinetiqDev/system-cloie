"use client";

import * as React from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { cn } from "@/lib/utils";

type ResponsiveDialogContextValue = {
  isDesktop: boolean;
};

const ResponsiveDialogContext = React.createContext<ResponsiveDialogContextValue | null>(null);

function useResponsiveDialog() {
  const context = React.useContext(ResponsiveDialogContext);
  if (!context) throw new Error("ResponsiveDialog parts must be used within ResponsiveDialog.");
  return context;
}

type ResponsiveDialogProps = {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function ResponsiveDialog({ children, open, onOpenChange }: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <ResponsiveDialogContext.Provider value={{ isDesktop }}>
      {isDesktop ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          {children}
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
          {children}
        </Drawer>
      )}
    </ResponsiveDialogContext.Provider>
  );
}

type ResponsiveDialogTriggerProps = {
  children?: React.ReactNode;
  className?: string;
  render?: React.ReactElement;
};

function ResponsiveDialogTrigger(props: ResponsiveDialogTriggerProps) {
  const { isDesktop } = useResponsiveDialog();
  return isDesktop ? <DialogTrigger {...props} /> : <DrawerTrigger {...props} />;
}

type ResponsiveDialogContentProps = {
  children?: React.ReactNode;
  className?: string;
  desktopClassName?: string;
  mobileClassName?: string;
  showCloseButton?: boolean;
};

function ResponsiveDialogContent({
  children,
  className,
  desktopClassName,
  mobileClassName,
  showCloseButton = true,
}: ResponsiveDialogContentProps) {
  const { isDesktop } = useResponsiveDialog();

  if (isDesktop) {
    return (
      <DialogContent
        className={cn(
          "flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden",
          className,
          desktopClassName
        )}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    );
  }

  return (
    <DrawerContent
      className={cn(
        "flex max-h-[calc(100dvh-1rem)] min-w-0 flex-col overflow-hidden",
        className,
        mobileClassName
      )}
    >
      {children}
    </DrawerContent>
  );
}

function ResponsiveDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  const { isDesktop } = useResponsiveDialog();
  return isDesktop ? (
    <DialogHeader className={className} {...props} />
  ) : (
    <DrawerHeader
      className={cn("group-data-[swipe-axis=y]/drawer-popup:text-left", className)}
      {...props}
    />
  );
}

function ResponsiveDialogTitle({ className, ...props }: React.ComponentProps<typeof DialogTitle>) {
  const { isDesktop } = useResponsiveDialog();
  return isDesktop ? (
    <DialogTitle className={className} {...props} />
  ) : (
    <DrawerTitle className={className} {...props} />
  );
}

function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const { isDesktop } = useResponsiveDialog();
  return isDesktop ? (
    <DialogDescription className={className} {...props} />
  ) : (
    <DrawerDescription className={className} {...props} />
  );
}

function ResponsiveDialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="responsive-dialog-body"
      className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", className)}
      {...props}
    />
  );
}

function ResponsiveDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  const { isDesktop } = useResponsiveDialog();
  return isDesktop ? (
    <DialogFooter className={className} {...props} />
  ) : (
    <DrawerFooter
      className={cn(
        "flex-col-reverse border-t pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
        className
      )}
      {...props}
    />
  );
}

type ResponsiveDialogCloseProps = {
  children?: React.ReactNode;
  className?: string;
  render?: React.ReactElement;
};

function ResponsiveDialogClose(props: ResponsiveDialogCloseProps) {
  const { isDesktop } = useResponsiveDialog();
  return isDesktop ? <DialogClose {...props} /> : <DrawerClose {...props} />;
}

export {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
};
