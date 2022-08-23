import {
  FormAction,
  FormContainer,
  FormItem,
  FormStep,
  RadioGroup,
  RadioInput,
} from "../components/Forms";

export default function Page() {
  return (
    <div>
      <FormContainer>
        <FormStep>
          <RadioGroup name={"make"}>
            <p>What make is your car?</p>
            <RadioInput value="honda">Honda</RadioInput>
            <RadioInput value="toyota">Toyota</RadioInput>
          </RadioGroup>
          <FormAction action={"prev"}>
            <button type={"button"}>Prev</button>
          </FormAction>
          <button>Next</button>
        </FormStep>
        <FormStep>
          <FormItem revealName="make" revealValue={"honda"}>
            <RadioGroup>
              <p>What model is your car?</p>
              <RadioInput value="fit">Fit</RadioInput>
              <RadioInput value="civic">Civic</RadioInput>
              <RadioInput value="accord">Accord</RadioInput>
            </RadioGroup>
          </FormItem>
          <FormItem revealName="make" revealValue={"toyota"}>
            <RadioGroup>
              <p>What model is your car?</p>
              <RadioInput value="yaris">Yaris</RadioInput>
              <RadioInput value="corolla">Corolla</RadioInput>
              <RadioInput value="camry">Camry</RadioInput>
            </RadioGroup>
          </FormItem>
          <FormAction action={"prev"}>
            <button type={"button"}>Prev</button>
          </FormAction>
          <button>Submit</button>
        </FormStep>
      </FormContainer>
    </div>
  );
}
