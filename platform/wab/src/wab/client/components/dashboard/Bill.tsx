import {
  DefaultBillProps,
  PlasmicBill,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicBill";
import { ApiFeatureTier, BillingFrequency } from "@/wab/shared/ApiSchema";
import { calculateBill } from "@/wab/shared/billing/billing-util";
import { assert } from "@/wab/shared/common";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

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
  const bill = calculateBill(tier, seats, billingFreq);
  return (
    <PlasmicBill
      root={{ ref }}
      {...rest}
      hideBasePrice={bill.baseSubtotal <= 0}
      hideSeatPrice={bill.additionalSeats <= 0}
      type={billingFreq}
      numSeats={seats}
      seatNoun={getSeatNoun(seats)}
      lessSeats={{
        onClick: () => setSeats(seats - 1),
      }}
      moreSeats={{
        onClick: () => setSeats(seats + 1),
      }}
      baseTitle={`${tier.name} plan`}
      baseDescription={
        minSeats > 0 ? `${minSeats} ${getSeatNoun(minSeats)}` : ""
      }
      baseSubtotal={`${bill.baseSubtotal}.00`}
      seatTitle={`${bill.additionalSeats} ${
        minSeats > 0 ? "additional" : tier.name
      } ${getSeatNoun(bill.additionalSeats)}`}
      seatDescription={`$${bill.seatPrice} x ${
        bill.additionalSeats
      } ${getSeatNoun(bill.additionalSeats)}`}
      seatSubtotal={`${bill.seatSubtotal}.00`}
      total={`${bill.total}.00`}
    />
  );
}

const Bill = React.forwardRef(Bill_);
export default Bill;

function getSeatNoun(n: number) {
  if (n === 1) {
    return "seat";
  } else {
    return "seats";
  }
}
