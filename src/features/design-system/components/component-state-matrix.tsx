"use client";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

/**
 * Actions and states matrix: every interactive primitive with its supported
 * states, rendered through the real production components.
 */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-center gap-3 border-b border-border px-3 py-3 last:border-b-0 md:grid-cols-[9rem_1fr]">
      <span className="text-body-sm text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-2.5">{children}</div>
    </div>
  );
}

export function ComponentStateMatrix() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">Buttons</h3>
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          <Row label="Variants">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </Row>
          <Row label="Sizes">
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Icon only">
              <Plus aria-hidden />
            </Button>
          </Row>
          <Row label="Loading">
            <Button loading>Save Changes</Button>
            <Button loading variant="outline">
              Submitting
            </Button>
          </Row>
          <Row label="Disabled">
            <Button disabled>Disabled</Button>
            <Button disabled variant="outline">
              Disabled
            </Button>
          </Row>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">Inputs</h3>
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          <Row label="Default">
            <Input placeholder="Placeholder text" className="w-56" />
          </Row>
          <Row label="With value">
            <Input defaultValue="Sample value" className="w-56" />
          </Row>
          <Row label="Read only">
            <Input readOnly defaultValue="Read only value" className="w-56" />
          </Row>
          <Row label="Disabled">
            <Input disabled defaultValue="Disabled value" className="w-56" />
          </Row>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">Selection controls</h3>
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          <Row label="Checkbox">
            <Label className="gap-2">
              <Checkbox defaultChecked />
              Checked
            </Label>
            <Label className="gap-2">
              <Checkbox />
              Unchecked
            </Label>
            <Label className="gap-2">
              <Checkbox disabled />
              Disabled
            </Label>
          </Row>
          <Row label="Switch">
            <Label className="gap-2">
              <Switch defaultChecked />
              On
            </Label>
            <Label className="gap-2">
              <Switch />
              Off
            </Label>
            <Label className="gap-2">
              <Switch size="sm" />
              Compact
            </Label>
          </Row>
          <Row label="Radio group">
            <RadioGroup defaultValue="one" className="flex flex-row gap-4">
              <Label className="gap-2">
                <RadioGroupItem value="one" />
                First option
              </Label>
              <Label className="gap-2">
                <RadioGroupItem value="two" />
                Second option
              </Label>
              <Label className="gap-2">
                <RadioGroupItem value="three" />
                Third option
              </Label>
            </RadioGroup>
          </Row>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">Progress indicators</h3>
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          <Row label="Determinate">
            <Progress value={35} className="w-64">
              <ProgressLabel>Processing</ProgressLabel>
              <ProgressValue>{(value) => value ?? "35%"}</ProgressValue>
            </Progress>
          </Row>
          <Row label="Indeterminate">
            <Spinner size="sm" label="Working" />
            <Spinner label="Working" />
            <Spinner size="lg" label="Working" />
          </Row>
        </div>
      </section>
    </div>
  );
}
