"use client";

import { ListTree, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
export type LegalNavigationSection = {
  id: string;
  title: string;
};

export type LegalNavigationDocument = {
  shortTitle: string;
  sections: LegalNavigationSection[];
};

export function MobileLegalDocumentNav({
  navigation,
}: {
  navigation: LegalNavigationDocument;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-40 border-t shadow-md backdrop-blur lg:hidden">
      <div className="mx-auto max-w-7xl px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6">
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger
            render={
              <Button
                variant="outline"
                size="lg"
                className="bg-surface min-h-11 w-full justify-between"
                aria-label={`Open ${navigation.shortTitle} section navigation`}
              />
            }
          >
            <span className="flex items-center gap-2">
              <ListTree data-icon="inline-start" aria-hidden="true" />
              <span>On this page</span>
            </span>
            <span className="text-text-muted" aria-hidden="true">
              {navigation.sections.length} sections
            </span>
          </DrawerTrigger>

          <DrawerContent className="max-h-[85dvh]">
            <DrawerHeader className="shrink-0 text-left">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <DrawerTitle>On this page</DrawerTitle>
                  <DrawerDescription>
                    Jump to a section in the {navigation.shortTitle}.
                  </DrawerDescription>
                </div>
                <DrawerClose
                  render={
                    <Button variant="ghost" size="icon-sm" aria-label="Close section navigation" />
                  }
                >
                  <XIcon aria-hidden="true" />
                </DrawerClose>
              </div>
            </DrawerHeader>
            <nav
              aria-label={`${navigation.shortTitle} sections`}
              className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"
            >
              <ol className="border-border flex flex-col gap-1 border-l pl-4 text-sm">
                {navigation.sections.map((section) => (
                  <li key={section.id}>
                    <Link
                      href={`#${section.id}`}
                      onClick={() => setOpen(false)}
                      className="text-text-secondary hover:text-primary focus-visible:ring-ring flex min-h-11 items-center underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {section.title}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
