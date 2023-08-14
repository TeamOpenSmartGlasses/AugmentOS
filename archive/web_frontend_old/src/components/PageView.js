import React from 'react';

export default class PageView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
        }
        
//        this.updateViewMoreUrl = this.updateViewMoreUrl.bind(this);
    }

//    componentDidUpdate(prevProps) {
//        if(prevProps.viewMoreUrl !== this.props.viewMoreUrl) {
//            this.updateViewMoreUrl();
//        }
//    }
//
//    updateViewMoreUrl(){
//        const viewMoreUrl = this.props.viewMoreUrl;
//    }

  render() {
    return (
    <div className="scrollcontent">
        <iframe
          scrolling="yes"
          src={this.props.viewMoreUrl}
          frameBorder="0"
          width="100%"
          height="100%"
        ></iframe>
    </div>

    )
  }
}
