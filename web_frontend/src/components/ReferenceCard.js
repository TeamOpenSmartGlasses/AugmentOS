import React from 'react';
import { Card, Button } from 'react-bootstrap';

const ReferenceCard = (props) => {
    const { ent, viewMoreButtonClicked } = props;

    function moreButtonClicked(event){
        let url = event.target.getAttribute('value');
//        window.open(url, '_blank');
        viewMoreButtonClicked(url);
    }

    function renderImgBlock(url) {
      return (<div className="col-md-4">
                 <img className="card-img" src={url} />
            </div>)
    }

    return (
        <div className="hyperlink-card">
            <Card style={{'width': '100%'}}>
                <div class="row no-gutters">
                    {ent.image_url ? renderImgBlock(ent.image_url) : null}
                    <div className="col-md-8">
                        <div class="card-body">
                            <h5 class="card-title">{ent.name}</h5>
                            <p>{ent.summary}</p>
                            {ent.url ? <Button onClick={moreButtonClicked} value={ent.url} variant="primary">Read More</Button> : null}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}

export default ReferenceCard
