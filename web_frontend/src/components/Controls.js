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
        <p>Welcome to the control panel!</p>
    </div>

    )
  }
}
