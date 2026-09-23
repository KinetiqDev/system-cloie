"use client";

import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type ResponsiveAlertDialogContextValue = {
  isDesktop: boolean;
};

const ResponsiveAlertDialogContext = React.createContext<ResponsiveAlertDialogContextValue | null>(
  null
);

function useResponsiveAlertDialog() {
  const context = React.useContext(ResponsiveAlertDialogContext);
  if (!context) {
    throw new Error("ResponsiveAlertDialog parts must be used within ResponsiveAlertDialog.");
  }
  return context;
}

type ResponsiveAlertDialogProps = {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Destructive confirmation in the shell the viewport calls for: a centered
 * `AlertDialog` on desktop, a bottom `Drawer` on mobile. Both keep the
 * AlertDialog contract — an explicit choice is the only way out, with no close
 * button — so a confirmation never reads as a dismissible form.
 */
function ResponsiveAlertDialog({ children, open, onOpenChange }: ResponsiveAlertDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <ResponsiveAlertDialogContext.Provider value={{ isDesktop }}>
      {isDesktop ? (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
          {children}
        </AlertDialog>
      ) : (
        <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
          {children}
        </Drawer>
      )}
    </ResponsiveAlertDialogContext.Provider>
  );
}

type ResponsiveAlertDialogContentProps = {
  children?: React.ReactNode;
  className?: string;
  desktopClassName?: string;
  mobileClassName?: string;
};

function ResponsiveAlertDialogContent({
  children,
  className,
  desktopClassName,
  mobileClassName,
}: ResponsiveAlertDialogContentProps) {
  const { isDesktop } = useResponsiveAlertDialog();

  if (isDesktop) {
    return (
      <AlertDialogContent
        className={cn(
          "flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden",
          className,
          desktopClassName
        )}
      >
        {children}
      </AlertDialogContent>
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

function ResponsiveAlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  const { isDesktop } = useResponsiveAlertDialog();
  return isDesktop ? (
    <AlertDialogHeader className={className} {...props} />
  ) : (
    <DrawerHeader
      className={cn("group-data-[swipe-axis=y]/drawer-popup:text-left", className)}
      {...props}
    />
  );
}

function ResponsiveAlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogTitle>) {
  const { isDesktop } = useResponsiveAlertDialog();
  return isDesktop ? (
    <AlertDialogTitle className={className} {...props} />
  ) : (
    <DrawerTitle className={className} {...props} />
  );
}

function ResponsiveAlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogDescription>) {
  const { isDesktop } = useResponsiveAlertDialog();
  return isDesktop ? (
    <AlertDialogDescription className={className} {...props} />
  ) : (
    <DrawerDescription className={className} {...props} />
  );
}

function ResponsiveAlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  const { isDesktop } = useResponsiveAlertDialog();
  return isDesktop ? (
    <AlertDialogFooter className={className} {...props} />
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

type ResponsiveAlertDialogActionProps = Omit<React.ComponentProps<typeof Button>, "variant"> &
  VariantProps<typeof buttonVariants>;

/** Confirms the action and dismisses the overlay in whichever shell is mounted. */
function ResponsiveAlertDialogAction({
  children,
  className,
  variant = "destructive",
  ...props
}: ResponsiveAlertDialogActionProps) {
  const { isDesktop } = useResponsiveAlertDialog();
  if (isDesktop) {
    return (
      <AlertDialogAction variant={variant} className={className} {...props}>
        {children}
      </AlertDialogAction>
    );
  }
  return (
    <DrawerClose render={<Button variant={variant} className={className} {...props} />}>
      {children}
    </DrawerClose>
  );
}

type ResponsiveAlertDialogCancelProps = Omit<React.ComponentProps<typeof Button>, "variant"> &
  VariantProps<typeof buttonVariants>;

/** Keeps the current state and dismisses the overlay; the safe default. */
function ResponsiveAlertDialogCancel({
  children,
  className,
  variant = "outline",
  ...props
}: ResponsiveAlertDialogCancelProps) {
  const { isDesktop } = useResponsiveAlertDialog();
  if (isDesktop) {
    return (
      <AlertDialogCancel variant={variant} className={className} {...props}>
        {children}
      </AlertDialogCancel>
    );
  }
  return (
    <DrawerClose render={<Button variant={variant} className={className} {...props} />}>
      {children}
    </DrawerClose>
  );
}

export {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
};
