import React from 'react';
import { useEffect, useState } from "react";
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { LoremIpsum } from "react-lorem-ipsum";
import { Card, Button } from 'react-bootstrap';
import Dictaphone from './components/Dictaphone.js';
import Referencer from './components/Referencer';
import Controls from './components/Controls';
import PageView from './components/PageView';
import Cookies from 'js-cookie';
import "./index.css";
import "./App.css";

export default class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            entities : [],
            transcript : null,
            viewMoreUrl : "https://www.media.mit.edu/research/?filter=groups"
        }

        this.updateTranscript = this.updateTranscript.bind(this);
        this.viewMoreButtonClicked = this.viewMoreButtonClicked.bind(this);
        this.initUserId();
    }

    componentDidMount() {
        this.interval = setInterval(() => this.updateUiBackendPoll(), 1000);
    }

    updateTranscript(transcript){
        this.setState({ transcript });
    }

    viewMoreButtonClicked(viewMoreUrl){
        this.setState({ viewMoreUrl });
    }

    initUserId(){
        let userId = Cookies.get('userId');
        if(userId == undefined || userId == null || userId == ""){
            console.log("No userID detected - generating random userID");
            userId = this.generateRandomUserId();
        }
        else
        {
            console.log("Previous userId found: " + userId)
        }
        this.setUserIdAndDeviceId(userId);
    }

    setUserIdAndDeviceId(newUserId){
        window.userId = newUserId;
        Cookies.set('userId', newUserId, { expires: 9999 });
        window.deviceId = "CSEWebFrontendDefault";
    }

    generateRandomUserId(){
        let rand = "x".repeat(5)
        .replace(/./g, c => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 62) ] );
        return "WebFrontend_" + rand;
    }

    //poll the backend for UI updates
    updateUiBackendPoll(){
        const subTranscript = {
            features: ["contextual_search_engine"], //list of features here
            userId: window.userId,
            deviceId: window.deviceId
        };

        axios.post("/api/ui_poll", subTranscript)
          .then(res => {
            const newEntitiesDict = res.data.result;
            if(res.data.success)
                console.log(res.data);
            if (res.data.result){
                var newEntitiesArray = Object.keys(newEntitiesDict).map(function(k) {
                    return newEntitiesDict[k];
                });
                console.log(newEntitiesArray);
                this.setState({ entities : this.state.entities.concat(newEntitiesArray) }, () => {});
            }
          }).catch(function (error) {
              console.error(error);
          });
      }

    render() {
    return (
<div id="pagecontainer">
        <div className="content">
        <div className="flexcol">
            <div id="myheader">
                <div className="flexrow">
                    <a target="_blank" href="https://github.com/CaydenPierce/ContextualSearchEngine"><img id="logo-img" src="CSE_logo_tmp.png"></img></a>
                    <a target="_blank" href=""><h1 id="title-name">ContextualSearchEngine</h1></a>
                </div>
            </div>

            <div id="data-box">
                <Card className="mycard" style={{'width': '100%'}}>
                    <h5 class="card-title scrolltitle">Settings & Controls</h5>
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
                    <Referencer entities={this.state.entities} transcript={this.state.transcript} viewMoreButtonClicked={this.viewMoreButtonClicked} />
                </div>
            </Card>
        </div>
        <div id="view-more-box">
            <Card className="mycard" style={{'width': '100%'}}>
                <h5 class="card-title scrolltitle">Media</h5>
                <PageView viewMoreUrl={this.state.viewMoreUrl}/>
            </Card>
        </div>

    </div>
</div>
    );
    }
}
