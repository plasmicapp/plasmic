import React from 'react';
import logo from './logo.svg';
import './App.css';
import Gallery from './components/Gallery';
import Checkbox from './components/Checkbox';
import Switch from './components/Switch';
import Select from './components/Select';
import { Item, useSelectOptionState } from '@plasmicapp/plank';
import Button from './components/Button';
import CheckIcon from './components/plasmic/plain_kit/PlasmicIcon__Check';
import TextField from './components/TextField';
import SearchIcon from './components/plasmic/plain_kit/PlasmicIcon__Search';
import ClearIcon from './components/plasmic/plain_kit/PlasmicIcon__Clear';
import RadioGroup from './components/RadioGroup';
import Radio from './components/Radio';
import Slider from './components/Slider';

function App() {
  return (
    <div className="App">
      <Gallery />
      <input/>
      <Checkbox>Check me out!</Checkbox>
      <Switch>Switch it!</Switch>
      <Select style={{width: 300}} placeholder="Pick something!">
        <Item key="ca">California</Item>
        <Item key="ny"><What id="ny"/></Item>
        <Item key="nj"><What id="nj"/></Item>
        <Item key="az"><What id="az"/></Item>
      </Select>
      <Select style={{width: 300}} label="Hello" placeholder="Pick something!" items={[{id: "ca"}, {id: "ny"}]}>
        {item => <Item key={item.id} textValue={item.id}><What id={item.id}/></Item>}
      </Select>
      <Button>Oh hai</Button>
      <Button startIcon={<CheckIcon />}>Hello</Button>
      <TextField label="Name"/>
      <TextField label="Search" startIcon={<SearchIcon/>} endIcon={<ClearIcon/>}/>
      <RadioGroup label="State">
        <Radio value="ca">California</Radio>
        <Radio value="ny">New York</Radio>
        <Radio value="nj">New Jersey</Radio>
        <Radio value="az">Arizona</Radio>
      </RadioGroup>
      <RadioGroup label="State" orientation="horizontal">
        <Radio value="ca">California</Radio>
        <Radio value="ny">New York</Radio>
        <Radio value="nj">New Jersey</Radio>
        <Radio value="az">Arizona</Radio>
      </RadioGroup>
      <div style={{width: 300, padding: 50}}>
        <Slider label="Stuff" defaultValue={[30]} />
      </div>
      <div style={{width: 300, padding: 50}}>
        <Slider label="Temperature" defaultValue={[25, 75]} isRange/>
      </div>
      <div style={{width: 300, padding: 50}}>
        <Slider label="Whatevs" defaultValue={[25, 50, 75]} getThumbLabel={index => `Label ${index}`} />
      </div>
      <input type="range"/>
    </div>
  );
}

function What(props: {id: string}) {
  const {id} = props;
  const state = useSelectOptionState(id);
  console.log("STATE", props, state);
  return <div>{id}</div>;
}

export default App;
