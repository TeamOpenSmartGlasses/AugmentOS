import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { LoremIpsum } from "react-lorem-ipsum";
import { Card, Button } from 'react-bootstrap';
import Dictaphone from './components/Dictaphone.js';
import Referencer from './components/Referencer';
import Controls from './components/Controls';
import "./index.css";
import "./App.css";

export default class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            transcript : null
        }
        this.updateTranscript = this.updateTranscript.bind(this);
    }

    componentDidMount() {
    }

    updateTranscript(transcript){
        this.setState({ transcript });
    }

    render() {
    return (
<div id="pagecontainer">
        <div className="content">
        <div className="flexcol">
            <div id="myheader">
                <div className="flexrow">
                    <a target="_blank" href="https://github.com/CaydenPierce/ContextualSearchEngine"><img id="logo-img" src="CSE_logo_tmp.png"></img></a>
                    <a target="_blank" href=""><h1 id="title-name">Contextual Search Engine</h1></a>
                </div>
            </div>

            <div id="data-box">
                <Card className="mycard" style={{'width': '100%'}}>
                    <h5 class="card-title scrolltitle">Controls + Settings</h5>
                    <Controls />
                </Card>
            </div>
            <div id="transcript-stream">
                <Card className="mycard" style={{'width': '100%'}}>
                    <h5 class="card-title scrolltitle">Live Transcript</h5>
                    <Dictaphone onTranscriptChanged={this.updateTranscript} />
                </Card>
            </div>
        </div>
        <div id="hyperlink-stream">
            <Card className="mycard" style={{'width': '100%'}}>
                <h5 class="card-title scrolltitle">References</h5>
                <div className="scrollcontent">
                    <Referencer transcript={this.state.transcript} />
                </div>
            </Card>
        </div>
    </div>
</div>
    );
    }
}
