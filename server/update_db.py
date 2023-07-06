'''
Script to update the database using .log file
'''
import ast
from tqdm import tqdm

from utils import LongTermMemory, UnitMemory, ShortTermMemory

contents = []

userId = 'cayden'

with open('{}.log'.format(userId), 'r') as f:
    logs = f.readlines()
    logs = [ast.literal_eval(line) for line in logs]


stm = ShortTermMemory()
ltm = LongTermMemory(userId)

print("Adding memories to long term memory")
for line in tqdm(logs):
    text = line['text']
    timestamp = line['timestamp']
    memory = UnitMemory(text, timestamp)

    decayed_memories = stm.add_memory(memory)
    # print(stm)
    # add to long term memory
    ltm.add_memories(decayed_memories)

ltm_memory = ltm.db.get()
print(*ltm_memory['documents'], sep='\n')
