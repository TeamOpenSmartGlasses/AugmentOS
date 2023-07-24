import React from 'react';
import axios from 'axios';
import ReferenceCard from './ReferenceCard.js';
import { Card, Button } from 'react-bootstrap';

export default class Referencer extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            entities : [],
            transcriptProcessWordIdx : 0,
            transcriptWordChangeThreshold : 5,
            transcriptBackSlider : 2,
            processingTranscript : false,
        }

        this.hyperlinkStream = React.createRef();

        this.updateTranscript = this.updateTranscript.bind(this);
        this.scrollToBottom = this.scrollToBottom.bind(this);
    }


    locations(substring,string){
        var a=[],i=-1;
        while((i=string.indexOf(substring,i+1)) >= 0) a.push(i);
        return a;
    }

    updateTranscript(){
        //only run an update if there are at least n new words in the transcript
        const transcriptWordCount = (this.props.transcript.match(/ /g)||[]).length + 1; //find number of spaces, which +1 is number of words
        if (!((transcriptWordCount - this.state.transcriptProcessWordIdx) > this.state.transcriptWordChangeThreshold)){
            return;
        } else if (this.state.processingTranscript){ //don't process if our last call hasn't yet returned
            return;
        }
        
        this.setState({ processingTranscript : true });

        //the sub part of the transcript which we'll send for processing
        //looks complicated - we just get 1) index by words, as indexing by chars will mess up entitiy recognition 2) use the BackSlider thing so that, for example, our last string was "in the United", the string will be "United States", instead of just "States", which wouldn't work for named entity recognition
        var transcriptProcessCharIdx = 0;
        if (this.props.transcript.length >= this.state.transcriptBackSlider){
            const wordOffset = this.state.transcriptProcessWordIdx - this.state.transcriptBackSlider - 1;
            if (wordOffset < 0){
                transcriptProcessCharIdx = 0;
            } else {
                //find all spaces, find the space before the word we want to start at, take +1 after that is the start of that word
                transcriptProcessCharIdx = this.locations(" ", this.props.transcript)[wordOffset] + 1;
            }
        }

        const subTranscript = {
            text: this.props.transcript.substring(transcriptProcessCharIdx),
            userId: "cayden",
            timestamp: Date.now(),
            isFinal: true,
        };

        //update the new idx so we don't process the same information again
        this.setState({ transcriptProcessWordIdx : transcriptWordCount });

        //send transcript to the backend
        console.log(subTranscript);
        axios.post("/api/chat", subTranscript)
          .then(res => {
            this.setState({ processingTranscript : false });
          }).catch(function (error) {
              console.error(error);
              this.setState({ processingTranscript : false });
          });
      }

    componentDidUpdate(prevProps) {
        if(prevProps.transcript !== this.props.transcript) {
            this.updateTranscript();
        }
        
        if(prevProps.entities!== this.props.entities) {
            this.setState({ entities : this.props.entities }, () => {this.scrollToBottom();});
        }
    }

    scrollToBottom = () => {
        this.hyperlinkStream.current.scrollIntoView({ behavior: "instant", block: 'nearest', inline: 'start'  });
    }

  render() {
    return (
    <div className="flexy">
            {
                this.state.entities.map(ent =>
                    <ReferenceCard ent={ent} viewMoreButtonClicked={this.props.viewMoreButtonClicked}/>
                )
            }
        <div ref={this.hyperlinkStream}></div>
    </div>

    )
  }
}
