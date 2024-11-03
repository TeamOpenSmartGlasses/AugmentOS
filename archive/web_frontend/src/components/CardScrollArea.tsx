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
        {isExplicitListening && (
            <ExplicitCard />
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
              <ReferenceCard
                key={`entity-${entity.uuid}`}
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
          ))}
    </ScrollArea>
  );
};

export default CardScrollArea;
