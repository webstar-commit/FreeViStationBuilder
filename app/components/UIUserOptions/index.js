import IconMenu from 'material-ui/IconMenu';
import MenuItem from 'material-ui/MenuItem';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import IconButton from 'material-ui/IconButton';
import RemoveRedEye from 'material-ui/svg-icons/image/remove-red-eye';
import PersonAdd from 'material-ui/svg-icons/social/person-add';
import ContentLink from 'material-ui/svg-icons/content/link';
import {RadioButton, RadioButtonGroup} from 'material-ui/RadioButton';
import Divider from 'material-ui/Divider';

import { grey50 } from 'material-ui/styles/colors';

function UIUserOptions() {
  return (
    <IconMenu
      iconButtonElement={<IconButton><MoreVertIcon color={grey50} /></IconButton>}
    >
      <RadioButtonGroup name="shipSpeed" defaultSelected="not_light">
        <RadioButton
          value="light"
          label="Side-By-Side"
          style={{marginBottom:16}}
        />
        <RadioButton
          value="not_light"
          label="Stereoscopic"
          style={{marginBottom:16}}
        />
      </RadioButtonGroup>
      <Divider />
      <MenuItem primaryText="Preview" leftIcon={<RemoveRedEye />} />
      <MenuItem primaryText="Share" leftIcon={<PersonAdd />} />
      <MenuItem primaryText="Get links" leftIcon={<ContentLink />} />
    </IconMenu>
  );
}

export default UIUserOptions;
