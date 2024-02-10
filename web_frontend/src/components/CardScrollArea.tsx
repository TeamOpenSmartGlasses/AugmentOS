import { ScrollArea } from "@mantine/core";
import { Collapse } from "@mui/material";
import { TransitionGroup } from "react-transition-group";
import ExplicitCard from "./ExplicitCard";
import ReferenceCard from "./ReferenceCard";
import {
  entitiesState,
  isExplicitListeningState,
  selectedCardIdState,
} from "../recoil";
import { useRecoilState, useRecoilValue } from "recoil";

const CardScrollArea = () => {
  const entities = useRecoilValue(entitiesState);
  const isExplicitListening = useRecoilValue(isExplicitListeningState);
  const [selectedCardId, setSelectedCardId] =
    useRecoilState(selectedCardIdState);

  return (
    <ScrollArea scrollHideDelay={100} h="100%" type="never">
      <TransitionGroup>
        {isExplicitListening && (
          <Collapse timeout={800}>
            <ExplicitCard />
          </Collapse>
        )}
        {entities
          .filter((e) => {
            if (e == null || e == undefined) {
              console.log("NULL ENTITY FOUND");
              return false;
            }
            return true;
          })
          .slice(0)
          .reverse()
          .map((entity, i) => (
            <Collapse key={`entity-${entity.uuid}`} timeout={800}>
              <ReferenceCard
                entity={entity}
                selected={
                  selectedCardId === entity.uuid && !isExplicitListening
                }
                onClick={() => {
                  setSelectedCardId(
                    entity.uuid === selectedCardId ? undefined : entity.uuid
                  );
                }}
                large={i === 0 && !isExplicitListening}
                pointer={Boolean(entity.url)}
              />
            </Collapse>
          ))}
      </TransitionGroup>
    </ScrollArea>
  );
};

export default CardScrollArea;
