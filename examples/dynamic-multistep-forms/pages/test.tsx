import {
  FormAction,
  FormContainer,
  FormItem,
  FormStep,
  RadioInput,
} from "../components/Forms";

export default function Page() {
  return (
    <div>
      <FormContainer>
        <FormStep>
          <FormItem required name={"make"}>
            <p>What make is your car?</p>
            <RadioInput value="honda">Honda</RadioInput>
            <RadioInput value="toyota">Toyota</RadioInput>
          </FormItem>
          <FormAction action={"prev"}>
            <button type={"button"}>Prev</button>
          </FormAction>
          <FormAction action={"next"}>
            <button>Next</button>
          </FormAction>
        </FormStep>
        <FormStep>
          <FormItem name={"model"} revealName="make" revealValue={"honda"}>
            <p>What model is your car?</p>
            <RadioInput value="fit">Fit</RadioInput>
            <RadioInput value="civic">Civic</RadioInput>
            <RadioInput value="accord">Accord</RadioInput>
          </FormItem>
          <FormItem name={"model"} revealName="make" revealValue={"toyota"}>
            <p>What model is your car?</p>
            <RadioInput value="yaris">Yaris</RadioInput>
            <RadioInput value="corolla">Corolla</RadioInput>
            <RadioInput value="camry">Camry</RadioInput>
          </FormItem>
          <FormAction action={"prev"}>
            <button type={"button"}>Prev</button>
          </FormAction>
          <FormAction action={"next"}>
            <button>Submit</button>
          </FormAction>
        </FormStep>
      </FormContainer>
    </div>
  );
}
