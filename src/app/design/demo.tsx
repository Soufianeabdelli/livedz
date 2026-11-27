"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectField, TextField } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";

export function Demo() {
  const [delivery, setDelivery] = useState("home");

  return (
    <div className="space-y-5">
      <Card className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="live">LIVE</Badge>
          <Badge tone="success">Confirmed</Badge>
          <Badge tone="warning">Pending</Badge>
          <Badge tone="danger">Cancelled</Badge>
          <Badge>Draft</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-serif text-xl font-semibold">Order form sample</h2>
        <TextField label="Full name" name="name" placeholder="Full name" autoComplete="name" />
        <TextField
          label="Phone"
          name="phone"
          dir="ltr"
          inputMode="tel"
          placeholder="05 55 00 00 00"
          hint="Algerian mobile number"
        />
        <SelectField label="Wilaya" name="wilaya" defaultValue="16">
          <option value="16">16 - Alger</option>
          <option value="31">31 - Oran</option>
        </SelectField>
        <SegmentedControl
          label="Delivery type"
          value={delivery}
          onChange={setDelivery}
          options={[
            { value: "home", label: "Home", hint: "600 DA" },
            { value: "desk", label: "Stop Desk", hint: "400 DA" },
          ]}
        />
        <Button className="w-full">Order now</Button>
      </Card>
    </div>
  );
}