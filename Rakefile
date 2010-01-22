require 'crxmake'

module Constants
  KEY_FILE = "../chromed_bird.pem"
  IGNORE_DIR = /\.git/
  IGNORE_FILE = /Rakefile|\.gitignore|.*\.crx$|.*\.zip$/
end

def current_branch
  `git branch` =~ /\* (.*)$/i
  current_branch = $1
end

task :default => [:pack]

task :pack do
  CrxMake.make(
    :ex_dir => ".",
    :pkey => Constants::KEY_FILE,
    :verbose => false,
    :ignorefile => Constants::IGNORE_FILE,
    :ignoredir => Constants::IGNORE_DIR
  ) do |extension|
    "./chromed_bird_#{extension.id}_#{extension.version}_#{current_branch}.crx"
  end
end

task :zip do
  CrxMake.zip(
    :ex_dir => ".",
    :pkey => Constants::KEY_FILE,
    :zip_output => "./chromed_bird.zip",
    :verbose => false,
    :ignorefile => Constants::IGNORE_FILE,
    :ignoredir => Constants::IGNORE_DIR
  ) do |extension|
    "./chromed_bird_#{extension.id}_#{extension.version}_#{current_branch}.zip"
  end
end