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

    function renderMapBlock(endpoint) {
      return (<div className="col-md-4">
                 <img className="card-img" src={endpoint} />
            </div>)
    }

    function referenceCardTypeChooser(ent){
        if (ent.map_image_path != null){
            return renderMapBlock(ent.map_image_path);
        } else if (ent.image_url != null){
             return renderImgBlock(ent.image_url);
        }
    }

    return (
        <div className="hyperlink-card">
            <Card style={{'width': '100%'}}>
                <div class="row no-gutters">
                    {referenceCardTypeChooser(ent)}
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
