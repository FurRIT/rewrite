{
  pkgs ? import <nixpkgs> { },
}:

pkgs.mkShellNoCC {
  packages = with pkgs; [
    # shell.nix
    nixfmt

    # server
    go
    gopls

    # frontend
    nodejs
    # prettier; installed via npm

    # docs/
    # vacuum; newer version installed using Go tool
    # prettier; installed via npm
    yaml-language-server
  ];
}
