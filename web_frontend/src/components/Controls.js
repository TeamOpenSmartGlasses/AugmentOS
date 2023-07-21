import React from 'react';
import axios from 'axios';
import { Card, Button } from 'react-bootstrap';

export default class Controls extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
        }
    }

  render() {
    return (
    <div className="scrollcontent">
        <h6>Controls</h6>
        <Button variant="primary">Stop</Button>
        <br/>
        <h6>Custom Data Sources</h6>
            <form>
              <input type="checkbox" id="vehicle1" name="vehicle1" value="Bike"/>
              <label for="vehicle1"> MIT Media Lab Website</label><br/>
              <input type="checkbox" id="vehicle2" name="vehicle2" value="Car"/>
              <label for="vehicle2"> Other custom data source</label><br/>
              <input type="checkbox" id="vehicle3" name="vehicle3" value="Boat"/>
              <label for="vehicle3"> CSV File Data source</label>
                <br/><br/>
              <input type="submit" value="Submit" />
            </form>
    </div>

    )
  }
}
