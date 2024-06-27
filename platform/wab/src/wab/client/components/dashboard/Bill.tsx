import {
  DefaultBillProps,
  PlasmicBill,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicBill";
import { assert } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import { ApiFeatureTier, BillingFrequency } from "@/wab/shared/ApiSchema";

interface BillProps extends DefaultBillProps {
  tier: ApiFeatureTier;
  seats: number;
  setSeats: (s: number) => void;
  // The billing frequency state is stored in the parent
  billingFreq: BillingFrequency;
}

function Bill_(props: BillProps, ref: HTMLElementRefOf<"div">) {
  const { tier, seats, setSeats, billingFreq, ...rest } = props;
  const minSeats = tier.minUsers;
  assert(seats >= minSeats, `There needs to be at least ${minSeats} seats`);
  const additionalSeats = seats - minSeats;
  const perSeatPrice =
    billingFreq === "year" ? tier.annualSeatPrice : tier.monthlySeatPrice;
  // This should reflect the minUsers (e.g. $480/mo for team of 8 seats)
  const basePrice =
    ((billingFreq === "year" ? tier.annualBasePrice : tier.monthlyBasePrice) ??
      0) + (DEVFLAGS.useNewFeatureTiers ? 0 : perSeatPrice * minSeats);

  const getSeatNoun = (s: number) => (s === 1 ? "seat" : "seats");
  const baseTitle = `${tier.name} team plan`;
  const baseDescription =
    minSeats > 0 ? `${minSeats} ${getSeatNoun(minSeats)}` : "";
  const baseSubtotal = basePrice;
  const seatTitle = `${additionalSeats} ${
    minSeats > 0 ? "additional" : tier.name
  } ${getSeatNoun(additionalSeats)}`;
  const seatDescription = `$${perSeatPrice} x ${additionalSeats} ${getSeatNoun(
    additionalSeats
  )}`;
  const seatSubtotal = perSeatPrice * additionalSeats;
  const total = (baseSubtotal ?? 0) + seatSubtotal;

  return (
    <PlasmicBill
      root={{ ref }}
      {...rest}
      hideBasePrice={basePrice <= 0}
      hideSeatPrice={additionalSeats <= 0}
      type={billingFreq}
      numSeats={seats}
      seatNoun={getSeatNoun(seats)}
      lessSeats={{
        onClick: () => setSeats(seats - 1),
      }}
      moreSeats={{
        onClick: () => setSeats(seats + 1),
      }}
      baseTitle={baseTitle}
      baseDescription={baseDescription}
      baseSubtotal={`${baseSubtotal}.00`}
      seatTitle={seatTitle}
      seatDescription={seatDescription}
      seatSubtotal={`${seatSubtotal}.00`}
      total={`${total}.00`}
    />
  );
}

const Bill = React.forwardRef(Bill_);
export default Bill;
