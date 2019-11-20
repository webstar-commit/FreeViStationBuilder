import React, { Component } from 'react';

import {List, ListItem} from 'material-ui/List';
import {GridList, GridTile} from 'material-ui/GridList';
import Checkbox from 'material-ui/Checkbox';
import SelectField from 'material-ui/SelectField';
import Menu from 'material-ui/Menu';
import MenuItem from 'material-ui/MenuItem';
import RaisedButton from 'material-ui/RaisedButton';

import Done from 'material-ui/svg-icons/action/done';

import { white, black } from 'material-ui/styles/colors'

export default class ConfigPane extends Component {
  constructor(props){
    super(props);
  }

  change(options, index, optName){
    let selectOption;
    const newOptions = options.map((opt)=>{
      let newOption = {...opt, active:false};
      if (opt.name===optName){
        newOption.active=true;
        selectOption=opt;
      }
      return newOption;
    });
    let newVariants = this.props.configMap.config.variants;
    const newVariant = {...newVariants[index], options:newOptions};
    newVariants.splice(index, 1, newVariant);
    if (optName) this.props.changeScene(selectOption, newVariants);
  }

  checkbox({ name, options, displayOptions, variants }, index) {
    const check = (ev, checked) => {
        var optName = displayOptions[checked ? 'on' : 'off'];
        this.change.bind(this)(options, index, optName);
    }
    const activeOption = options.find((opt) => opt.active);
    return <Checkbox onCheck={check} checked={activeOption.name===displayOptions.on}
      style={{padding:'10px 0'}}/>
  }

  select({ name, options, variants }, index) {
    function switchVariantHandler(ev, value) {
      var optName = value;
      this.change.bind(this)(options, index, optName);
    }
    const activeOption = options.find((opt) => opt.active);
    const selectOptions = options.map(function(opt) {
      return <MenuItem value={opt.name} key={opt.name} primaryText={opt.name}
        checked={opt.name===activeOption.name} insetChildren={true}/>
    });
    return <ListItem
      nestedItems={[
        <Menu
          onChange={switchVariantHandler.bind(this)}
          autoWidth={false}
          listStyle={{width:'350px', padding:'0px'}}
        >
          {selectOptions}
        </Menu>
      ]}
      primaryText={name}
      secondaryText={activeOption.name}
      primaryTogglesNestedList={true}
    />;
  }

  blackOrWhite(color){
    const r = parseInt(color.substring(1, 3), 16)/255.0;
    const g = parseInt(color.substring(3, 5), 16)/255.0;
    const b = parseInt(color.substring(5), 16)/255.0;
    const maxCol = Math.max(Math.max(r,g),b);
    return maxCol<0.5;
  }

  color({ name, options, variants }, index, viewOpts) {
    viewOpts = viewOpts || {};

    function switchVariantHandler(optName) {
      return function(ev) {
        this.change.bind(this)(options, index, optName);
      }.bind(this);
    }
    const activeOption = options.find((opt) => opt.active);
    const listChildren = options.map((opt) => {
      let icon = null
      if (opt.name === activeOption.name){
        const bw = this.blackOrWhite(opt.color);
        icon = <Done color={bw ? white : black}/>
      }
      return <GridTile>
        <RaisedButton
          onClick={switchVariantHandler.bind(this)(opt.name)}
          backgroundColor={opt.color}
          style={{height:'50px'}}
          key={opt.name}
          icon={icon}
        />
      </GridTile>;
    });

    return <div>
      <GridList cols={5} cellHeight={50} style={{padding:'10px 0'}}>
        {listChildren}
      </GridList>
    </div>
  }

  renderVariant(variant, index) {
    const type = variant.displayType || 'select'
    const view = this[type];
    if (!view) throw new Error('Unknown variant displayType: '+variant.displayType);
    else if (type!=='select'){
      return <ListItem key={variant.name}>
        <label>{variant.name}</label>
        {view.bind(this)(variant, index)}
      </ListItem>
    }
    else return view.bind(this)(variant, index);
  }

  render(){
    const { config } = this.props.configMap;
    if(!config.variants) return null;
    const variantViews = config.variants.map(
      (variant, index) => this.renderVariant(variant, index)
    );
    return <List>
      {variantViews}
    </List>;
  }
}
