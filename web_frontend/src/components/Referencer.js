import React from "react";
import axios from "axios";
import ReferenceCard from "./ReferenceCard.js";
import { debounce } from "lodash";

export default class Referencer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      entities: [],
      transcriptStartIdx: 0
    };

    this.hyperlinkStream = React.createRef();
    this.updateTranscript = this.updateTranscript.bind(this);
    this.scrollToBottom = this.scrollToBottom.bind(this);
  }

  updateTranscript() {
    this.submitTranscript(false);
    this.debouncedSubmitFinalTranscript();
  }

  submitTranscript = (isFinal) => {
    const text = this.props.transcript.substring(this.state.transcriptStartIdx);

    const payload = {
      text: text,
      userId: window.userId,
      timestamp: Date.now(),
      isFinal,
    };

    if (isFinal && text !== "") {
      this.setState({
        ...this.state,
        transcriptStartIdx: this.props.transcript.length + 1,
      });
    }

    axios
      .post("/api/chat", payload)
      .then((res) => {})
      .catch(function (error) {
        console.error(error);
      });
  };

  debouncedSubmitFinalTranscript = debounce(
    () => this.submitTranscript(true),
    800
  );

  componentDidUpdate(prevProps) {
    if (prevProps.transcript !== this.props.transcript) {
      this.updateTranscript();
    }

    if (prevProps.entities !== this.props.entities) {
      this.setState({ entities: this.props.entities }, () => {
        this.scrollToBottom();
      });
    }
  }

  scrollToBottom = () => {
    this.hyperlinkStream.current.scrollIntoView({
      behavior: "instant",
      block: "nearest",
      inline: "start",
    });
  };

  render() {
    return (
      <div className="flexy">
        {this.state.entities.map((ent) => (
          <ReferenceCard
            ent={ent}
            viewMoreButtonClicked={this.props.viewMoreButtonClicked}
          />
        ))}
        <div ref={this.hyperlinkStream}></div>
      </div>
    );
  }
}
