"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { showToast } from "@/components/ui/toast";
import { Bell, ChevronDown, Info, MoreHorizontal } from "lucide-react";

function OverlayDemo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-body-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function OverlayAndFeedbackShowcase() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">Modals</h3>
        <div className="flex flex-wrap gap-6">
          <OverlayDemo label="Dialog">
            <Dialog>
              <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reference dialog</DialogTitle>
                  <DialogDescription>
                    A modal dialog for quick reference edits.
                  </DialogDescription>
                </DialogHeader>
                <p className="text-body-sm text-muted-foreground">
                  Dialog content renders in a portal with a scrim backdrop.
                </p>
                <DialogFooter>
                  <DialogTrigger render={<Button variant="outline" />}>Close</DialogTrigger>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </OverlayDemo>

          <OverlayDemo label="Alert dialog">
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" />}>
                Open confirmation
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete sample record?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This reference action would remove the sample record. Nothing is deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </OverlayDemo>

          <OverlayDemo label="Sheet">
            <Sheet>
              <SheetTrigger render={<Button variant="outline" />}>Open panel</SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Reference panel</SheetTitle>
                  <SheetDescription>
                    A side panel for contextual reference content.
                  </SheetDescription>
                </SheetHeader>
                <p className="text-body-sm text-muted-foreground">
                  Sheet content slides in from the side with a scrim backdrop.
                </p>
                <SheetFooter>
                  <SheetTrigger render={<Button variant="outline" />}>Close</SheetTrigger>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </OverlayDemo>

          <OverlayDemo label="Drawer">
            <Drawer>
              <DrawerTrigger render={<Button variant="outline" />}>Open drawer</DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Reference drawer</DrawerTitle>
                  <DrawerDescription>
                    A bottom sheet for reference actions.
                  </DrawerDescription>
                </DrawerHeader>
                <p className="text-body-sm text-muted-foreground">
                  Drawer content slides in from the bottom with a scrim backdrop.
                </p>
                <DrawerFooter>
                  <DrawerTrigger render={<Button variant="outline" />}>Close</DrawerTrigger>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </OverlayDemo>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">Floating content</h3>
        <div className="flex flex-wrap gap-6">
          <OverlayDemo label="Popover">
            <Popover>
              <PopoverTrigger render={<Button variant="outline" />}>
                <Bell aria-hidden />
                Notifications
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <PopoverHeader>
                  <PopoverTitle>Reference notifications</PopoverTitle>
                  <PopoverDescription>
                    Popover content floats above the page.
                  </PopoverDescription>
                </PopoverHeader>
                <p className="text-body-sm text-muted-foreground">
                  No notifications are generated by the showcase.
                </p>
              </PopoverContent>
            </Popover>
          </OverlayDemo>

          <OverlayDemo label="Dropdown menu">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" />}>
                Actions
                <ChevronDown aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Reference actions</DropdownMenuLabel>
                <DropdownMenuItem>View details</DropdownMenuItem>
                <DropdownMenuItem>Edit sample</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">Delete sample</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </OverlayDemo>

          <OverlayDemo label="Tooltip">
            <TooltipProvider delay={0}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button variant="outline" size="icon" aria-label="More information">
                      <Info aria-hidden />
                    </Button>
                  }
                />
                <TooltipContent>Reference tooltip content</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </OverlayDemo>

          <OverlayDemo label="Icon button with menu">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" aria-label="More actions" />}
              >
                <MoreHorizontal aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>Duplicate sample</DropdownMenuItem>
                <DropdownMenuItem>Archive sample</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </OverlayDemo>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">Toasts</h3>
        <p className="text-body-sm text-muted-foreground">
          Toasts render through the shared root ToastProvider.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            onClick={() => showToast("Reference saved locally.", "success")}
          >
            Success toast
          </Button>
          <Button
            variant="outline"
            onClick={() => showToast("Reference action is in progress.", "warning")}
          >
            Warning toast
          </Button>
          <Button
            variant="outline"
            onClick={() => showToast("Reference action failed. Try again.", "error")}
          >
            Error toast
          </Button>
          <Button
            variant="outline"
            onClick={() => showToast("This is a reference information toast.", "information")}
          >
            Information toast
          </Button>
        </div>
      </section>
    </div>
  );
}
