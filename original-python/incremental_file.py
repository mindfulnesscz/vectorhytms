import os
import re
import glob


def save_incrementaly(directory, content):

  # Find all files in the directory that match the 'vector_*.svg' pattern
  vector_files = glob.glob(os.path.join(directory, 'vector_*.svg'))

  # Sort files to find the last one by the number in their name
  vector_files.sort(key=lambda f: int(re.search(r'vector_(\d+)\.svg', f).group(1)))

  # Get the last number from the sorted list, if it's not empty
  last_num = int(re.search(r'vector_(\d+)\.svg', vector_files[-1]).group(1)) if vector_files else 0

  # Process each file
  new_num = last_num + 1  # Increment the last number for a new file

  #new_file_name = f"vector_{new_num}.svg"

  new_file_name = "vector_{}.svg".format(new_num)

  new_file_path = os.path.join(directory, new_file_name)  # New file path

  with open(new_file_path, 'w') as file_new:
    file_new.write(content)






